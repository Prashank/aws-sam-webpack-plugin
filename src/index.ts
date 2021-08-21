import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { schema } from "yaml-cfn";
import yaml from "js-yaml";

interface AwsSamProjectMap {
  [pname: string]: string;
}

interface AwsSamPluginOptions {
  projects: AwsSamProjectMap;
  outFile: string;
  vscodeDebug: boolean;
}

interface IEntryPointMap {
  [pname: string]: string;
}

interface SamConfig {
  buildRoot: string;
  entryPointName: string;
  outFile: string;
  projectKey: string;
  templateYml: any; // YAML content of the SAM template
  templateName: string;
}

interface IEntryForResult {
  entryPoints: IEntryPointMap;
  launchConfigs: any[];
  samConfigs: SamConfig[];
}

interface ILayerConfig {
  templateName: string;
  resourceKey: string;
  buildRoot: string;
  contentDir: string;
  buildMethod?: string;
}

class AwsSamPlugin {
  private static defaultTemplates = ["template.yaml", "template.yml"];
  private launchConfig: any;
  private options: AwsSamPluginOptions;
  private samConfigs: SamConfig[];
  private layersConfigs: ILayerConfig[] = [];

  constructor(options?: Partial<AwsSamPluginOptions>) {
    this.options = {
      projects: { default: "." },
      outFile: "app",
      vscodeDebug: true,
      ...options,
    };
    this.samConfigs = [];
  }

  // Returns the name of the SAM template file or null if it's not found
  private findTemplateName(prefix: string) {
    if (fs.statSync(prefix).isFile()) {
      return prefix;
    }
    for (const f of AwsSamPlugin.defaultTemplates) {
      const template = `${prefix}/${f}`;
      if (fs.existsSync(template)) {
        return template;
      }
    }
    return null;
  }

  // Returns a webpack entry object based on the SAM template
  public entryFor(
    projectKey: string, // example: "default"
    projectPath: string, // relative from source project path
    projectTemplateName: string, // base name of template file name
    projectTemplateContent: string, // content of SAM template
    outFile: string // example app.js
  ): IEntryForResult {
    const entryPoints: IEntryPointMap = {};
    const launchConfigs: any[] = [];
    const samConfigs: SamConfig[] = [];

    const buildRoot = `${projectPath ? projectPath + "/" : ""}.aws-sam/build`;

    const templateYml = yaml.load(projectTemplateContent, {
      filename: projectTemplateName,
      schema,
    }) as any;

    const defaultRuntime = templateYml.Globals?.Function?.Runtime ?? null;
    const defaultHandler = templateYml.Globals?.Function?.Handler ?? null;
    const defaultCodeUri = templateYml.Globals?.Function?.CodeUri ?? null;

    // Loop through all of the resources
    for (const resourceKey in templateYml.Resources) {
      const resource = templateYml.Resources[resourceKey];

      // Correct paths for files that can be uploaded using "aws couldformation package"
      if (resource.Type === "AWS::ApiGateway::RestApi" && typeof resource.Properties.BodyS3Location === "string") {
        resource.Properties.BodyS3Location = path.relative(buildRoot, resource.Properties.BodyS3Location);
      }
      if (resource.Type === "AWS::Lambda::Function" && typeof resource.Properties.Code === "string") {
        resource.Properties.Code = path.relative(buildRoot, resource.Properties.Code);
      }
      if (
        resource.Type === "AWS::AppSync::GraphQLSchema" &&
        typeof resource.Properties.DefinitionS3Location === "string" &&
        resource.Properties.DefinitionS3Location.startsWith("s3://") === false
      ) {
        resource.Properties.DefinitionS3Location = path.relative(buildRoot, resource.Properties.DefinitionS3Location);
      }
      if (
        resource.Type === "AWS::AppSync::Resolver" &&
        typeof resource.Properties.RequestMappingTemplateS3Location === "string" &&
        resource.Properties.RequestMappingTemplateS3Location.startsWith("s3://") === false
      ) {
        resource.Properties.RequestMappingTemplateS3Location = path.relative(
          buildRoot,
          resource.Properties.RequestMappingTemplateS3Location
        );
      }
      if (
        resource.Type === "AWS::AppSync::Resolver" &&
        typeof resource.Properties.ResponseMappingTemplateS3Location === "string" &&
        resource.Properties.ResponseMappingTemplateS3Location.startsWith("s3://") === false
      ) {
        resource.Properties.ResponseMappingTemplateS3Location = path.relative(
          buildRoot,
          resource.Properties.ResponseMappingTemplateS3Location
        );
      }
      if (
        resource.Type === "AWS::Serverless::Api" &&
        typeof resource.Properties.DefinitionUri === "string" &&
        resource.Properties.DefinitionUri.startsWith("s3://") === false
      ) {
        resource.Properties.DefinitionUri = path.relative(buildRoot, resource.Properties.DefinitionUri);
      }
      if (
        resource.Type === "AWS::Include" &&
        typeof resource.Properties.Location === "string" &&
        resource.Properties.Location.startsWith("s3://") === false
      ) {
        resource.Properties.Location = path.relative(buildRoot, resource.Properties.Location);
      }
      if (
        resource.Type === "AWS::ElasticBeanstalk::ApplicationVersion" &&
        typeof resource.Properties.SourceBundle === "string" &&
        resource.Properties.SourceBundle.startsWith("s3://") === false
      ) {
        resource.Properties.SourceBundle = path.relative(buildRoot, resource.Properties.SourceBundle);
      }
      if (
        resource.Type === "AWS::CloudFormation::Stack" &&
        typeof resource.Properties.TemplateURL === "string" &&
        resource.Properties.TemplateURL.startsWith("s3://") === false
      ) {
        resource.Properties.TemplateURL = path.relative(buildRoot, resource.Properties.TemplateURL);
      }
      if (
        resource.Type === "AWS::Glue::Job" &&
        resource.Properties.Command &&
        typeof resource.Properties.Command.ScriptLocation === "string" &&
        resource.Properties.Command.ScriptLocation.startsWith("s3://") === false
      ) {
        resource.Properties.Command.ScriptLocation = path.relative(
          buildRoot,
          resource.Properties.Command.ScriptLocation
        );
      }
      if (
        resource.Type === "AWS::StepFunctions::StateMachine" &&
        typeof resource.Properties.DefinitionS3Location === "string" &&
        resource.Properties.DefinitionS3Location.startsWith("s3://") === false
      ) {
        resource.Properties.DefinitionS3Location = path.relative(buildRoot, resource.Properties.DefinitionS3Location);
      }
      // Find all of the functions
      if (resource.Type === "AWS::Serverless::Function") {
        const properties = resource.Properties;
        if (!properties) {
          throw new Error(`${resourceKey} is missing Properties`);
        }

        // Check the runtime is supported
        if (!["nodejs10.x", "nodejs12.x", "nodejs14.x"].includes(properties.Runtime ?? defaultRuntime)) {
          throw new Error(`${resourceKey} has an unsupport Runtime. Must be nodejs10.x, nodejs12.x or nodejs14.x`);
        }

        // Continue with a warning if they're using inline code
        if (properties.InlineCode) {
          console.log(
            `WARNING: This plugin does not compile inline code. The InlineCode for '${resourceKey}' will be copied 'as is'.`
          );
          continue;
        }

        // Check we have a valid handler
        const handler = properties.Handler ?? defaultHandler;
        if (!handler) {
          throw new Error(`${resourceKey} is missing a Handler`);
        }
        const handlerComponents = handler.split(".");
        if (handlerComponents.length !== 2) {
          throw new Error(`${resourceKey} Handler must contain exactly one "."`);
        }

        // Check we have a CodeUri
        const codeUri = properties.CodeUri ?? defaultCodeUri;
        if (!codeUri) {
          throw new Error(`${resourceKey} is missing a CodeUri`);
        }

        const basePathPrefix = projectPath === "" ? "." : `./${projectPath}`;
        const basePath = `${basePathPrefix}/${codeUri}`;
        const fileBase = `${basePath}/${handlerComponents[0]}`;

        // Generate the launch config for the VS Code debugger
        launchConfigs.push({
          name: projectKey === "default" ? resourceKey : `${projectKey}:${resourceKey}`,
          type: "node",
          request: "attach",
          address: "localhost",
          port: 5858,
          localRoot: `\${workspaceFolder}/${buildRoot}/${resourceKey}`,
          remoteRoot: "/var/task",
          protocol: "inspector",
          stopOnEntry: false,
          outFiles: [`\${workspaceFolder}/${buildRoot}/${resourceKey}/**/*.js`],
          sourceMaps: true,
          skipFiles: ["/var/runtime/**/*.js", "<node_internals>/**/*.js"],
        });

        // Add the entry point for webpack
        const entryPointName = projectKey === "default" ? resourceKey : `${projectKey}#${resourceKey}`;
        entryPoints[entryPointName] = fileBase;
        resource.Properties.CodeUri = resourceKey;
        resource.Properties.Handler = `${outFile}.${handlerComponents[1]}`;
        samConfigs.push({
          buildRoot,
          entryPointName,
          outFile: `./${buildRoot}/${resourceKey}/${outFile}.js`,
          projectKey,
          templateYml,
          templateName: projectTemplateName,
        });
      }

      if (resource.Type === "AWS::Serverless::LayerVersion") {
        const properties = resource.Properties;
        if (!properties || typeof properties !== "object") {
          throw new Error(`${resourceKey} is missing Properties`);
        }

        // Check we have a CodeUri
        const contentUri = properties.ContentUri ?? defaultCodeUri;
        if (!contentUri) {
          throw new Error(`${resourceKey} is missing a CodeUri`);
        }

        const basePathPrefix = projectPath === "" ? "." : `./${projectPath}`;
        const contentDir = `${basePathPrefix}/${contentUri}`;

        const buildMethod = resource.Metadata?.BuildMethod;
        if (buildMethod === "makefile") {
          if (
            !this.layersConfigs.find(
              (e) =>
                e.templateName === projectTemplateName && e.resourceKey === resourceKey && e.buildRoot === buildRoot
            )
          ) {
            this.layersConfigs.push({
              templateName: projectTemplateName,
              resourceKey,
              buildRoot,
              contentDir,
              buildMethod,
            });
          }
        } else {
          throw new Error(`Unsupported layer BuildMethod '${buildMethod}'`);
        }
      }
    }

    return { entryPoints, launchConfigs, samConfigs };
  }

  public entry() {
    // Reset the entry points and launch config
    let allEntryPoints: IEntryPointMap = {};
    this.launchConfig = {
      version: "0.2.0",
      configurations: [],
    };
    this.samConfigs = [];

    // Loop through each of the "projects" from the options
    for (const projectKey in this.options.projects) {
      // The value will be the name of a folder or a template file
      const projectFolderOrTemplateName = this.options.projects[projectKey];

      // If the projectFolderOrTemplateName isn't a file then we should look for common template file names
      const projectTemplateFileName = this.findTemplateName(projectFolderOrTemplateName);

      // If we still cannot find a project template name then throw an error because something is wrong
      if (projectTemplateFileName === null) {
        throw new Error(
          `Could not find ${AwsSamPlugin.defaultTemplates.join(" or ")} in ${projectFolderOrTemplateName}`
        );
      }

      const projectTemplateContent = fs.readFileSync(projectTemplateFileName).toString();

      // Retrieve the entry points, VS Code debugger launch configs and SAM config for this entry
      const { entryPoints, launchConfigs, samConfigs } = this.entryFor(
        projectKey, // projectKey
        path.relative(".", path.dirname(projectTemplateFileName)), // projectPath
        path.basename(projectTemplateFileName), // projectTemplateName
        projectTemplateContent, // projecTemplate
        this.options.outFile // outFile
      );

      // Addd them to the entry pointsm launch configs and SAM confis we've already discovered.
      Object.assign(allEntryPoints, entryPoints);
      this.launchConfig.configurations.push(...launchConfigs);
      this.samConfigs.push(...samConfigs);
    }

    // Once we're done return the entry points
    return allEntryPoints;
  }

  public filename(chunkData: any) {
    const samConfig = this.samConfigs.find((c) => c.entryPointName === chunkData.chunk.name);
    if (!samConfig) {
      throw new Error(`Unable to find filename for ${chunkData.chunk.name}`);
    }
    return samConfig.outFile;
  }

  public apply(compiler: any) {
    compiler.hooks.afterEmit?.tapPromise(
      "SamPlugin",
      async (_compilation: any /* webpack.Compilation */): Promise<void> => {
        await this.buildLayers();
      }
    );

    compiler.hooks.afterEmit.tap("SamPlugin", (_compilation: any) => {
      this.writeTemplateFiles();
      this.writeVscodeLaunch();
    });
  }

  private async buildLayers(): Promise<void> {
    if (!(this.samConfigs && this.launchConfig)) {
      throw new Error("It looks like AwsSamPlugin.entry() was not called");
    }
    for (const layerConfig of this.layersConfigs) {
      const { templateName, resourceKey, buildRoot, contentDir, buildMethod } = layerConfig;
      if (buildMethod === "makefile") {
        console.log("Start building layer %s#%s ... ", templateName, resourceKey);
        const artifactsDir = `${buildRoot}/${resourceKey}`;
        try {
          fs.mkdirSync(buildRoot);
        } catch (err) {
          if (!(err?.code === "EEXIST")) throw err;
        }
        try {
          fs.mkdirSync(artifactsDir);
        } catch (err) {
          if (!(err?.code === "EEXIST")) throw err;
        }
        const cmdLine = [
          //
          `make`,
          `-C "${contentDir}"`,
          `ARTIFACTS_DIR="${path.resolve(artifactsDir)}"`,
          `build-${resourceKey}`,
        ].join(" ");
        // console.info("MAKE %s cmdLine: %s", resourceKey, cmdLine);
        try {
          await new Promise((res, rej) => {
            exec(cmdLine, (e) => (e?.code ? rej(e) : res(e)));
          });
        } catch (err) {
          if (err.cmd) {
            console.error(err.stdout);
            console.error(err.stderr);
          }
          throw err;
        }
      } else {
        throw new Error(`Unsupported layer BuildMethod '${buildMethod}'`);
      }
    }
  }

  private writeTemplateFiles() {
    if (!(this.samConfigs && this.launchConfig)) {
      throw new Error("It looks like AwsSamPlugin.entry() was not called");
    }
    const yamlUnique = this.samConfigs.reduce((a, e) => {
      const { buildRoot, templateYml } = e;
      a[buildRoot] = templateYml;
      return a;
    }, {} as Record<string, any>);
    for (const buildRoot in yamlUnique) {
      const samConfig = yamlUnique[buildRoot];
      fs.writeFileSync(`${buildRoot}/template.yaml`, yaml.dump(samConfig, { indent: 2, quotingType: '"', schema }));
    }
  }

  private writeVscodeLaunch(): void {
    if (!(this.samConfigs && this.launchConfig)) {
      throw new Error("It looks like AwsSamPlugin.entry() was not called");
    }
    if (this.options.vscodeDebug !== true) {
      return;
    }
    if (!fs.existsSync(".vscode")) {
      fs.mkdirSync(".vscode");
    }
    const launchPath = ".vscode/launch.json";

    const launchContent = JSON.stringify(this.launchConfig, null, 2)
      .replace(/^(.*"configurations": \[\s*)$/m, "$1\n    // BEGIN AwsSamPlugin")
      .replace(/(\n  \s*\][\r\n]+\})$/m, "\n    // END AwsSamPlugin$1");
    const regexBlock = /\s+\/\/ BEGIN AwsSamPlugin(\r|\n|.)+\/\/ END AwsSamPlugin/m;

    // get new "configurations" content
    const matches = launchContent.match(regexBlock);
    if (!matches) {
      throw new Error(launchPath + " new content does not match");
    }
    const launchConfigurations = matches[0];

    if (fs.existsSync(launchPath)) {
      const launchContentOld = fs.readFileSync(launchPath).toString("utf8");
      if (launchContentOld.match(regexBlock)) {
        // partial rewrite contents
        const newContent = launchContentOld.replace(regexBlock, () => launchConfigurations);
        fs.writeFileSync(launchPath, newContent);
      } else {
        // add configurations
        const newContent = launchContentOld.replace(/(\n  \]\n\})$/m, (p0, p1) => `,${launchConfigurations}${p1}`);
        fs.writeFileSync(launchPath, newContent);
      }
    } else {
      fs.writeFileSync(launchPath, launchContent);
    }
  }
}

export = AwsSamPlugin;

import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { schema } from "yaml-cfn";
import yaml from "js-yaml";

interface AwsSamProjectMap {
  [pname: string]: string | { path: string; outFile: string };
}

interface AwsSamPluginOptions {
  projects: AwsSamProjectMap;
  outFile: string;
  vscodeDebug: boolean;
}

interface IWebpackEntryPointMap {
  [pname: string]: string;
}

interface IResourceEntry {
  projectKey: string;
  resourceType: "function" | "layer";
  resourceKey: string;
  resourcePath: string; // relative path to resource CoreUri/ContentUri and so
  buildMethod: "webpack" | "makefile";
  buildRoot: string;
  // the entry point for webpack
  entryPointName: string;
  entryPointPath: string;
  assetFilePath: string;
}

interface IProjectEntry {
  // projectKey: string;
  isLoaded?: boolean;
  path: string; // path to project folder
  buildRoot: string; // path to <any>/.aws-sam/buil
  outFile: string; // name of bundle file of each entry
  // Templates
  templateFileName: string;
  templateName: string;
  templateYml?: any; // YAML content of the SAM template
  resources: IResourceEntry[];
}

function buildProjectEntryPointMap(proj: IProjectEntry): Record<string, string> {
  const resources = proj.resources.filter((res) => res.buildMethod === "webpack" && res.entryPointName);
  const response: Record<string, string> = {};
  resources.forEach((res) => {
    response[res.entryPointName] = res.entryPointPath;
  });
  return response;
}

function rewriteAssetRelativePath(Properties: any, key: string, buildRoot: string) {
  if (typeof Properties !== "object") return;
  if (!(key in Properties)) return;
  if (typeof Properties[key] === "string" && Properties[key].startsWith("s3://") === false) {
    // FIXME: add correction path relative of template path. And add linked files to assets
    Properties[key] = path.relative(buildRoot, Properties[key]);
  }
}

function buildVscodeLaunchObject(projectKey: string, resourceKey: string, buildRoot: string) {
  return {
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
  };
}

class AwsSamPlugin {
  private static defaultTemplates = ["template.yaml", "template.yml"];
  private options: AwsSamPluginOptions;
  // private layersConfigs: ILayerConfig[] = [];
  private projectsMap: Record<string, IProjectEntry> = {};

  constructor(options?: Partial<AwsSamPluginOptions>) {
    this.options = {
      projects: { default: "." },
      outFile: "app",
      vscodeDebug: true,
      ...options,
    };
    this.projectsMap = {};
    for (const projectKey in this.options.projects) {
      const projectDirtyOpts = this.options.projects[projectKey];
      const projectOpts = typeof projectDirtyOpts === "string" ? { path: projectDirtyOpts } : projectDirtyOpts;

      const outFile = "outFile" in projectOpts && projectOpts.outFile ? projectOpts.outFile : this.options.outFile;

      const projectFolderOrTemplateName = projectOpts.path || ".";
      let templateFileName = this.findTemplateName(projectFolderOrTemplateName);
      if (templateFileName === null) {
        throw new Error(
          `Could not find ${AwsSamPlugin.defaultTemplates.join(" or ")} in ${projectFolderOrTemplateName}`
        );
      }
      const projectRelPath = path.relative(".", path.dirname(templateFileName));
      const projectPath = projectRelPath == "" || projectRelPath == "." ? "." : `./${projectRelPath}`;
      const templateName = path.basename(templateFileName);
      const buildRoot = (projectRelPath == "" || projectRelPath == "." ? "" : projectRelPath + "/") + ".aws-sam/build";

      this.projectsMap[projectKey] = {
        path: projectPath,
        buildRoot,
        outFile,
        templateFileName: path.relative(".", templateFileName),
        templateName,
        resources: [],
      };
    }
  }

  // Returns the name of the SAM template file or null if it's not found
  private findTemplateName(prefix: string) {
    try {
      if (fs.statSync(prefix).isFile()) {
        return prefix;
      }
    } catch (err) {
      //
    }
    for (const f of AwsSamPlugin.defaultTemplates) {
      const template = `${prefix || "."}/${f}`;
      if (fs.existsSync(template)) {
        return template;
      }
    }
    return null;
  }

  // Returns a webpack entry object based on the SAM template
  public initProject(projectKey: string): void {
    const projectEntry = this.projectsMap[projectKey];
    if (!projectEntry) {
      throw new Error(`project '${projectKey}' not found`);
    }

    const { buildRoot, path: projectPath, templateName, templateFileName, outFile } = projectEntry;
    const projectTemplateContent = fs.readFileSync(templateFileName).toString();
    projectEntry.resources = [];

    const templateYml = yaml.load(projectTemplateContent, {
      filename: templateName,
      schema,
    }) as any;
    projectEntry.templateYml = templateYml;

    const defaultRuntime = templateYml.Globals?.Function?.Runtime ?? null;
    const defaultHandler = templateYml.Globals?.Function?.Handler ?? null;
    const defaultCodeUri = templateYml.Globals?.Function?.CodeUri ?? null;

    // Loop through all of the resources
    for (const resourceKey in templateYml.Resources) {
      const resource = templateYml.Resources[resourceKey];
      const { Type, Properties: properties } = resource;

      // Correct paths for files that can be uploaded using "aws couldformation package"
      if (Type === "AWS::ApiGateway::RestApi") {
        rewriteAssetRelativePath(properties, "BodyS3Location", buildRoot);
      }
      if (Type === "AWS::Lambda::Function" && typeof properties.Code === "string") {
        rewriteAssetRelativePath(properties, "Code", buildRoot);
      }
      if (Type === "AWS::AppSync::GraphQLSchema") {
        rewriteAssetRelativePath(properties, "DefinitionS3Location", buildRoot);
      }
      if (Type === "AWS::AppSync::Resolver") {
        rewriteAssetRelativePath(properties, "RequestMappingTemplateS3Location", buildRoot);
      }
      if (Type === "AWS::AppSync::Resolver") {
        rewriteAssetRelativePath(properties, "ResponseMappingTemplateS3Location", buildRoot);
      }
      if (Type === "AWS::Serverless::Api") {
        rewriteAssetRelativePath(properties, "DefinitionUri", buildRoot);
      }
      if (Type === "AWS::Include") {
        rewriteAssetRelativePath(properties, "Location", buildRoot);
      }
      if (Type === "AWS::ElasticBeanstalk::ApplicationVersion") {
        rewriteAssetRelativePath(properties, "SourceBundle", buildRoot);
      }
      if (Type === "AWS::CloudFormation::Stack") {
        rewriteAssetRelativePath(properties, "TemplateURL", buildRoot);
      }
      if (Type === "AWS::Glue::Job" && properties.Command) {
        rewriteAssetRelativePath(properties.Command, "ScriptLocation", buildRoot);
      }
      if (Type === "AWS::StepFunctions::StateMachine") {
        rewriteAssetRelativePath(properties, "DefinitionS3Location", buildRoot);
      }
      // Find all of the functions
      if (Type === "AWS::Serverless::Function") {
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

        const basePathPrefix = ["", "."].includes(projectPath) ? "." : projectPath;
        // TODO: Add determine nested stacks
        const entryPointName = projectKey === "default" ? resourceKey : `${projectKey}#${resourceKey}`;
        const entryPointPath = `${basePathPrefix}/${codeUri}/${handlerComponents[0]}`;

        properties.CodeUri = resourceKey;
        properties.Handler = `${outFile}.${handlerComponents[1]}`;

        projectEntry.resources.push({
          projectKey,
          resourceType: "function",
          resourceKey,
          resourcePath: `${basePathPrefix}/${codeUri}`,
          buildRoot,
          buildMethod: "webpack",
          entryPointName,
          entryPointPath,
          assetFilePath: `./${buildRoot}/${resourceKey}/${outFile}.js`,
        });
      }

      if (Type === "AWS::Serverless::LayerVersion") {
        const properties = resource.Properties;
        if (!properties || typeof properties !== "object") {
          throw new Error(`${resourceKey} is missing Properties`);
        }

        // Check we have a ContentUri
        const contentUri = properties.ContentUri;
        if (!contentUri) {
          throw new Error(`${resourceKey} is missing a ContentUri`);
        }

        const basePathPrefix = ["", "."].includes(projectPath) ? "." : projectPath;
        const resourcePath = `${basePathPrefix}/${contentUri}`.replace(/^(\.\/)+/, "./");

        const buildMethod = resource.Metadata?.BuildMethod;
        if (buildMethod === "makefile") {
          if (!projectEntry.resources.find((e) => e.projectKey === projectKey && e.resourceKey === resourceKey)) {
            projectEntry.resources.push({
              projectKey,
              resourceType: "layer",
              resourceKey,
              resourcePath,
              buildRoot,
              buildMethod,
              entryPointName: "", // Layers does not shows to Webpack
              entryPointPath: "",
              assetFilePath: "",
            });
          }
        } else {
          throw new Error(`Unsupported layer BuildMethod '${buildMethod}'`);
        }
      }
    }
    projectEntry.isLoaded = true;
  }

  // Workaround for support old tests :))
  public entryFor(
    projectKey: string, // example: "default"
    projectPath: string, // relative from source project path
    _projectTemplateName: string, // base name of template file name
    _projectTemplateContent: string, // content of SAM template
    outFile: string // example app.js
  ) {
    if (!this.projectsMap[projectKey]) {
      throw new Error(`Project '${projectKey}' not found`);
    }
    const proj = this.projectsMap[projectKey];
    if (
      path.relative(".", projectPath) !== path.relative(".", proj.path) &&
      !(["", "."].includes(projectPath) && ["", "."].includes(proj.path))
    ) {
      throw new Error(`Project '${projectKey}' path diferents in setting(${proj.path}) and tests(${projectPath})`);
    }
    // this.projectsMap[projectKey] = {
    //   ...(this.projectsMap[projectKey] || {}),
    //   path: projectPath || ".",
    //   outFile: outFile,
    // };
    this.initProject(projectKey);

    const projResources = proj.resources.filter((res) => res.buildMethod === "webpack" && res.entryPointName);

    const samConfigs = projResources.map((e) => ({
      buildRoot: e.buildRoot,
      entryPointName: e.entryPointName,
      projectKey: e.projectKey,
      templateName: proj.templateName,
      templateYml: proj.templateYml,
      outFile: e.assetFilePath,
    }));
    return {
      entryPoints: buildProjectEntryPointMap(this.projectsMap[projectKey]),
      launchConfigs: projResources.map((e) => buildVscodeLaunchObject(e.projectKey, e.resourceKey, e.buildRoot)),
      samConfigs,
    };
  }

  public entry(): IWebpackEntryPointMap {
    // Loop through each of the "projects"
    for (const projectKey in this.projectsMap) {
      const projectEntry = this.projectsMap[projectKey];
      if (!projectEntry) {
        throw new Error(`project '${projectKey}' not found`);
      }
      this.initProject(projectKey);
    }

    // Once we're done return the entry points
    const response: IWebpackEntryPointMap = {};
    for (const projectKey in this.projectsMap) {
      const proj = this.projectsMap[projectKey];
      Object.assign(response, buildProjectEntryPointMap(proj));
    }
    return response;
  }

  public filename(chunkData: any) {
    for (const projectKey in this.projectsMap) {
      const projectEntry = this.projectsMap[projectKey];
      const resource = projectEntry.resources.find((e) => e.entryPointName === chunkData.chunk.name);
      if (resource) return resource.assetFilePath;
    }
    throw new Error(`Unable to find filename for ${chunkData.chunk.name}`);
  }

  public apply(compiler: any) {
    compiler.hooks.afterEmit?.tapPromise(
      "SamPlugin",
      async (_compilation: any /* webpack.Compilation */): Promise<void> => {
        await this.buildLayers();
      }
    );

    compiler.hooks.afterEmit.tap("SamPlugin", (_compilation: any) => {
      for (const projectsKey in this.projectsMap) {
        if (!this.projectsMap[projectsKey].isLoaded) {
          throw new Error("It looks like AwsSamPlugin.entry() was not called");
        }
      }
      this.writeTemplateFiles();
      this.writeVscodeLaunch();
    });
  }

  private async buildLayers(): Promise<void> {
    const layers: IResourceEntry[] = [];
    Object.keys(this.projectsMap).forEach((projectKey) => {
      const proj = this.projectsMap[projectKey];
      const projLeyers = proj.resources.filter((e) => e.resourceType === "layer");
      layers.push(...projLeyers);
    });

    for (const layerConfig of layers) {
      const { projectKey, resourceKey, buildRoot, resourcePath, buildMethod } = layerConfig;
      if (buildMethod === "makefile") {
        console.log("Start building layer %s#%s ... ", projectKey, resourceKey);
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
          `-C "${resourcePath}"`,
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
    for (const projectKey in this.projectsMap) {
      const proj = this.projectsMap[projectKey];
      const { buildRoot, templateYml } = proj;
      if (!yaml) {
        throw new Error(`Project template ${proj.path}#${proj.templateName} not loaded!`);
      }
      fs.writeFileSync(`${buildRoot}/template.yaml`, yaml.dump(templateYml, { indent: 2, quotingType: '"', schema }));
    }
  }

  private writeVscodeLaunch(): void {
    if (this.options.vscodeDebug !== true) {
      return;
    }
    if (!fs.existsSync(".vscode")) {
      fs.mkdirSync(".vscode");
    }
    const launchsArray: any[] = [];
    for (const projectKey in this.projectsMap) {
      const proj = this.projectsMap[projectKey];
      const { buildRoot, resources } = proj;
      const projLaunchs = resources
        .filter((e) => e.resourceType === "function" && e.buildMethod === "webpack")
        .map((res) => buildVscodeLaunchObject(res.projectKey, res.resourceKey, res.buildRoot));
      launchsArray.push(...projLaunchs);
    }
    const launchConfig = {
      version: "0.2.0",
      configurations: launchsArray,
    };
    const launchPath = ".vscode/launch.json";

    const launchContent = JSON.stringify(launchConfig, null, 2)
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

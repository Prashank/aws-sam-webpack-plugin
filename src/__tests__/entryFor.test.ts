import * as fs from "fs";
import SamPlugin from "../index";

jest.mock("fs");

function fsPrepCommon(template: string, templateName = "./template.yaml") {
  // @ts-ignore
  fs.__clearMocks();
  // @ts-ignore
  fs.__setMockDirs(["."]);
  const files: Record<string, string> = {};
  files[templateName] = template;

  // @ts-ignore
  fs.__setMockFiles(files);
}

describe("Function Runtime", () => {
  test("can be set globally to nodejs10.x", () => {
    const template = `
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31
Globals:
  Function:
    Runtime: nodejs10.x
Resources:
  MyLambda:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/my-lambda
      Handler: app.handler
`;
    fsPrepCommon(template);
    const plugin = new SamPlugin();

    const entries = plugin.entryFor("default", "", "template.yaml", template, "app");
    expect(entries).toMatchSnapshot();
  });

  test("can be set globally to nodejs12.x", () => {
    const template = `
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31
Globals:
  Function:
    Runtime: nodejs12.x
Resources:
  MyLambda:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/my-lambda
      Handler: app.handler
`;
    fsPrepCommon(template);
    const plugin = new SamPlugin();

    const entries = plugin.entryFor("default", "", "template.yaml", template, "app");
    expect(entries).toMatchSnapshot();
  });

  test("can be set globally to nodejs14.x", () => {
    const template = `
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31
Globals:
  Function:
    Runtime: nodejs14.x
Resources:
  MyLambda:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/my-lambda
      Handler: app.handler
`;
    fsPrepCommon(template);
    const plugin = new SamPlugin();

    const entries = plugin.entryFor("default", "", "template.yaml", template, "app");
    expect(entries).toMatchSnapshot();
  });

  test("can be set at the function to nodejs10.x", () => {
    const template = `
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31
Resources:
  MyLambda:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/my-lambda
      Handler: app.handler
      Runtime: nodejs10.x
`;
    fsPrepCommon(template);
    const plugin = new SamPlugin();

    const entries = plugin.entryFor("default", "", "template.yaml", template, "app");
    expect(entries).toMatchSnapshot();
  });

  test("can be set at the function to nodejs12.x", () => {
    const template = `
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31
Resources:
  MyLambda:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/my-lambda
      Handler: app.handler
      Runtime: nodejs12.x
`;
    fsPrepCommon(template);
    const plugin = new SamPlugin();

    const entries = plugin.entryFor("default", "", "template.yaml", template, "app");
    expect(entries).toMatchSnapshot();
  });

  test("can be set at the function to nodejs14.x", () => {
    const template = `
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31
Resources:
  MyLambda:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/my-lambda
      Handler: app.handler
      Runtime: nodejs14.x
`;
    fsPrepCommon(template);
    const plugin = new SamPlugin();

    const entries = plugin.entryFor("default", "", "template.yaml", template, "app");
    expect(entries).toMatchSnapshot();
  });

  test("must be set globally or at the function", () => {
    const template = `
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31
Resources:
  MyLambda:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/my-lambda
      Handler: app.handler
`;
    fsPrepCommon(template);
    const plugin = new SamPlugin();

    expect(() => plugin.entryFor("default", "", "template.yaml", template, "app")).toThrowError(
      "MyLambda has an unsupport Runtime. Must be nodejs10.x, nodejs12.x or nodejs14.x"
    );
  });

  test("must have a valid value if set globally", () => {
    const template = `
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31
Globals:
  Function:
    Runtime: nodejs8.x
Resources:
  MyLambda:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/my-lambda
      Handler: app.handler
`;
    fsPrepCommon(template);
    const plugin = new SamPlugin();

    expect(() => plugin.entryFor("default", "", "template.yaml", template, "app")).toThrowError(
      "MyLambda has an unsupport Runtime. Must be nodejs10.x, nodejs12.x or nodejs14.x"
    );
  });

  test("must have a valid value if set at the function", () => {
    const template = `
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31
Resources:
  MyLambda:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/my-lambda
      Handler: app.handler
      Runtime: nodejs8.x
`;
    fsPrepCommon(template);
    const plugin = new SamPlugin();

    expect(() => plugin.entryFor("default", "", "template.yaml", template, "app")).toThrowError(
      "MyLambda has an unsupport Runtime. Must be nodejs10.x, nodejs12.x or nodejs14.x"
    );
  });

  test("can be set global and at function", () => {
    const template = `
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31
Globals:
  Function:
    Runtime: nodejs8.x
Resources:
  MyLambda:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/my-lambda
      Handler: app.handler
      Runtime: nodejs12.x
`;
    fsPrepCommon(template);
    const plugin = new SamPlugin();

    const entries = plugin.entryFor("default", "", "template.yaml", template, "app");
    expect(entries).toMatchSnapshot();
  });
});

describe("Function Handler", () => {
  test("can be set globally", () => {
    const template = `
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31
Globals:
  Function:
    Handler: app.handler
Resources:
  MyLambda:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/my-lambda
      Runtime: nodejs14.x
`;
    fsPrepCommon(template);
    const plugin = new SamPlugin();

    const entries = plugin.entryFor("default", "", "template.yaml", template, "app");
    expect(entries).toMatchSnapshot();
  });

  test("can be set at the function", () => {
    const template = `
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31
Resources:
  MyLambda:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/my-lambda
      Handler: app.handler
      Runtime: nodejs14.x
`;
    fsPrepCommon(template);
    const plugin = new SamPlugin();

    const entries = plugin.entryFor("default", "", "template.yaml", template, "app");
    expect(entries).toMatchSnapshot();
  });

  test("can be set global and at function", () => {
    const template = `
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31
Globals:
  Function:
    Handler: app.globalHandler
Resources:
  MyLambda:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/my-lambda
      Handler: app.handler
      Runtime: nodejs14.x
`;
    fsPrepCommon(template);
    const plugin = new SamPlugin();

    const entries = plugin.entryFor("default", "", "template.yaml", template, "app");
    expect(entries).toMatchSnapshot();
  });

  test("must be set", () => {
    const template = `
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31
Resources:
  MyLambda:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/my-lambda
      Runtime: nodejs14.x
`;
    fsPrepCommon(template);
    const plugin = new SamPlugin();

    expect(() => plugin.entryFor("default", "", "template.yaml", template, "app")).toThrowError(
      "MyLambda is missing a Handler"
    );
  });
});

describe("Function CodeUri", () => {
  test("can be set globally", () => {
    const template = `
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31
Globals:
  Function:
    CodeUri: src/my-lambda
Resources:
  MyLambda:
    Type: AWS::Serverless::Function
    Properties:
      Handler: app.handler
      Runtime: nodejs14.x
`;
    fsPrepCommon(template);
    const plugin = new SamPlugin();

    const entries = plugin.entryFor("default", "", "template.yaml", template, "app");
    expect(entries).toMatchSnapshot();
  });

  test("can be set at the function", () => {
    const template = `
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31
Resources:
  MyLambda:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/my-lambda
      Handler: app.handler
      Runtime: nodejs14.x
`;
    fsPrepCommon(template);
    const plugin = new SamPlugin();

    const entries = plugin.entryFor("default", "", "template.yaml", template, "app");
    expect(entries).toMatchSnapshot();
  });

  test("can be set global or at the function", () => {
    const template = `
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31
Globals:
  Function:
    CodeUri: src/my-lambda
Resources:
  MyLambda:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/my-lambda
      Handler: app.handler
      Runtime: nodejs14.x
`;
    fsPrepCommon(template);
    const plugin = new SamPlugin();

    const entries = plugin.entryFor("default", "", "template.yaml", template, "app");
    expect(entries).toMatchSnapshot();
  });

  test("must be set", () => {
    const template = `
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31
Resources:
  MyLambda:
    Type: AWS::Serverless::Function
    Properties:
      Handler: app.handler
      Runtime: nodejs14.x
`;
    fsPrepCommon(template);
    const plugin = new SamPlugin();

    expect(() => plugin.entryFor("default", "", "template.yaml", template, "app")).toThrowError(
      "MyLambda is missing a CodeUri"
    );
  });
});

test("Fails if Properties is missing", () => {
  const template = `
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31
Resources:
  MyLambda:
    Type: AWS::Serverless::Function
`;
  fsPrepCommon(template);
  const plugin = new SamPlugin();

  expect(() => plugin.entryFor("default", "", "template.yaml", template, "app")).toThrowError(
    "MyLambda is missing Properties"
  );
});

test("Fails if Hanlde doesn't include a '.'", () => {
  const template = `
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31
Resources:
  MyLambda:
    Type: AWS::Serverless::Function
    Properties:
      Handler: apphandler
      Runtime: nodejs14.x
`;
  fsPrepCommon(template);
  const plugin = new SamPlugin();

  expect(() => plugin.entryFor("default", "", "template.yaml", template, "app")).toThrowError(
    'MyLambda Handler must contain exactly one "."'
  );
});

test("Allows Inline code with warning", () => {
  const template = `
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31
Resources:
  MyLambda:
    Type: AWS::Serverless::Function
    Properties:
      InlineCode: src/my-lambda
      Handler: app.handler
      Runtime: nodejs14.x
`;
  fsPrepCommon(template);
  const plugin = new SamPlugin();

  const originalLog = console.log;
  console.log = jest.fn();
  const entries = plugin.entryFor("default", "", "template.yaml", template, "app");
  //   expect(entries).toMatchSnapshot();
  expect(console.log).toBeCalledWith(
    "WARNING: This plugin does not compile inline code. The InlineCode for 'MyLambda' will be copied 'as is'."
  );
  console.log = originalLog;
});

describe("Launch config name", () => {
  test("is not prefixed when the projectKey is 'default'", () => {
    const template = `
  AWSTemplateFormatVersion: "2010-09-09"
  Transform: AWS::Serverless-2016-10-31
  Globals:
    Function:
      Runtime: nodejs14.x
  Resources:
    MyLambda:
      Type: AWS::Serverless::Function
      Properties:
        CodeUri: src/my-lambda
        Handler: app.handler
  `;
    fsPrepCommon(template);
    const plugin = new SamPlugin();

    const entries = plugin.entryFor("default", "", "template.yaml", template, "app");
    expect(entries.launchConfigs[0].name).toEqual("MyLambda");
  });

  test("is prefixed when the projectKey isn't 'default'", () => {
    const template = `
  AWSTemplateFormatVersion: "2010-09-09"
  Transform: AWS::Serverless-2016-10-31
  Globals:
    Function:
      Runtime: nodejs14.x
  Resources:
    MyLambda:
      Type: AWS::Serverless::Function
      Properties:
        CodeUri: src/my-lambda
        Handler: app.handler
  `;
    fsPrepCommon(template);
    const plugin = new SamPlugin({ projects: { xxx: "." } });

    const entries = plugin.entryFor("xxx", "", "template.yaml", template, "app");
    expect(entries.launchConfigs[0].name).toEqual("xxx:MyLambda");
  });
});

describe("SAM config entryPointName:", () => {
  test("is not prefixed when the projectKey isn 'default'", () => {
    const template = `
  AWSTemplateFormatVersion: "2010-09-09"
  Transform: AWS::Serverless-2016-10-31
  Globals:
    Function:
      Runtime: nodejs14.x
  Resources:
    MyLambda:
      Type: AWS::Serverless::Function
      Properties:
        CodeUri: src/my-lambda
        Handler: app.handler
  `;
    fsPrepCommon(template);
    const plugin = new SamPlugin();

    const entries = plugin.entryFor("default", "", "template.yaml", template, "app");
    expect(entries.samConfigs[0].entryPointName).toEqual("MyLambda");
  });

  test("is prefixed when the projectKey isn't 'default'", () => {
    const template = `
  AWSTemplateFormatVersion: "2010-09-09"
  Transform: AWS::Serverless-2016-10-31
  Globals:
    Function:
      Runtime: nodejs14.x
  Resources:
    MyLambda:
      Type: AWS::Serverless::Function
      Properties:
        CodeUri: src/my-lambda
        Handler: app.handler
  `;
    fsPrepCommon(template);
    const plugin = new SamPlugin({ projects: { xxx: "." } });

    const entries = plugin.entryFor("xxx", "", "template.yaml", template, "app");
    expect(entries.samConfigs[0].entryPointName).toEqual("xxx#MyLambda");
  });
});

describe("When the template is in a subfolder", () => {
  test("it should match the happy snapshot", () => {
    const template = `
  AWSTemplateFormatVersion: "2010-09-09"
  Transform: AWS::Serverless-2016-10-31
  Globals:
    Function:
      Runtime: nodejs14.x
  Resources:
    MyLambda:
      Type: AWS::Serverless::Function
      Properties:
        CodeUri: src/my-lambda
        Handler: app.handler
  `;
    fsPrepCommon(template, "xxx/template.yaml");
    const plugin = new SamPlugin({ projects: { xxx: "xxx" } });

    const entries = plugin.entryFor("xxx", "xxx", "template.yaml", template, "app");
    expect(entries).toMatchSnapshot();
  });

  test("it sets the entryPoint correctly", () => {
    const template = `
  AWSTemplateFormatVersion: "2010-09-09"
  Transform: AWS::Serverless-2016-10-31
  Globals:
    Function:
      Runtime: nodejs14.x
  Resources:
    MyLambda:
      Type: AWS::Serverless::Function
      Properties:
        CodeUri: src/my-lambda
        Handler: app.handler
  `;
    fsPrepCommon(template, "xxx/template.yaml");
    const plugin = new SamPlugin({ projects: { xxx: "xxx" } });

    const entries = plugin.entryFor("xxx", "xxx", "template.yaml", template, "app");
    expect(entries.entryPoints["xxx#MyLambda"]).toEqual("./xxx/src/my-lambda/app");
  });

  test("it sets the launch config localRoot correctly", () => {
    const template = `
  AWSTemplateFormatVersion: "2010-09-09"
  Transform: AWS::Serverless-2016-10-31
  Globals:
    Function:
      Runtime: nodejs14.x
  Resources:
    MyLambda:
      Type: AWS::Serverless::Function
      Properties:
        CodeUri: src/my-lambda
        Handler: app.handler
  `;
    fsPrepCommon(template, "xxx/template.yaml");
    const plugin = new SamPlugin({ projects: { xxx: "xxx" } });

    const entries = plugin.entryFor("xxx", "xxx", "template.yaml", template, "app");
    expect(entries.launchConfigs[0].localRoot).toEqual("${workspaceFolder}/xxx/.aws-sam/build/MyLambda");
  });

  test("it sets the SAM config builtRoot correctly", () => {
    const template = `
  AWSTemplateFormatVersion: "2010-09-09"
  Transform: AWS::Serverless-2016-10-31
  Globals:
    Function:
      Runtime: nodejs14.x
  Resources:
    MyLambda:
      Type: AWS::Serverless::Function
      Properties:
        CodeUri: src/my-lambda
        Handler: app.handler
  `;
    fsPrepCommon(template, "xxx/template.yaml");
    const plugin = new SamPlugin({ projects: { xxx: "xxx" } });

    const entries = plugin.entryFor("xxx", "xxx", "template.yaml", template, "app");
    expect(entries.samConfigs[0].buildRoot).toEqual("xxx/.aws-sam/build");
  });

  test("it sets the SAM config outFile correctly", () => {
    const template = `
  AWSTemplateFormatVersion: "2010-09-09"
  Transform: AWS::Serverless-2016-10-31
  Globals:
    Function:
      Runtime: nodejs14.x
  Resources:
    MyLambda:
      Type: AWS::Serverless::Function
      Properties:
        CodeUri: src/my-lambda
        Handler: app.handler
  `;
    fsPrepCommon(template, "xxx/template.yaml");
    const plugin = new SamPlugin({ projects: { xxx: "xxx" } });

    const entries = plugin.entryFor("xxx", "xxx", "template.yaml", template, "app");
    expect(entries.samConfigs[0].outFile).toEqual("./xxx/.aws-sam/build/MyLambda/app.js");
  });
});

test("It ignores non AWS::Serverless::Function resosurces", () => {
  const template = `
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31
Resources:
  MyLambda:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/my-lambda
      Handler: app.handler
      Runtime: nodejs14.x
  FakeResource:
    Type: AWS::FakeResource::NahNah
`;
  fsPrepCommon(template);
  const plugin = new SamPlugin();

  const entries = plugin.entryFor("default", "", "template.yaml", template, "app");
  expect(entries).toMatchSnapshot();
});

test("JS output files uses outFile parameter", () => {
  const template = `
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31
Globals:
  Function:
    Runtime: nodejs14.x
Resources:
  MyLambda:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/my-lambda
      Handler: app.handler
`;
  fsPrepCommon(template);
  const plugin = new SamPlugin({ outFile: "index" });

  const entries = plugin.entryFor("default", "", "template.yaml", template, "index");
  expect(entries).toMatchSnapshot();
});

describe("Property paths are rewritten correctly", () => {
  test("BodyS3Location property for the AWS::ApiGateway::RestApi resource", () => {
    const template = `
  AWSTemplateFormatVersion: "2010-09-09"
  Transform: AWS::Serverless-2016-10-31
  Resources:
    MyLambda:
      Type: AWS::Serverless::Function
      Properties:
        CodeUri: src/my-lambda
        Handler: app.handler
        Runtime: nodejs14.x
    MyResource:
      Type: AWS::ApiGateway::RestApi
      Properties:
        BodyS3Location: path/to/file
  `;
    fsPrepCommon(template);
    const plugin = new SamPlugin();

    const entries = plugin.entryFor("default", "", "template.yaml", template, "app");
    expect(entries.samConfigs[0]?.templateYml?.Resources?.MyResource?.Properties?.BodyS3Location).toEqual(
      "../../path/to/file"
    );
  });

  test("Code property for the AWS::Lambda::Function resource", () => {
    const template = `
  AWSTemplateFormatVersion: "2010-09-09"
  Transform: AWS::Serverless-2016-10-31
  Resources:
    MyLambda:
      Type: AWS::Serverless::Function
      Properties:
        CodeUri: src/my-lambda
        Handler: app.handler
        Runtime: nodejs14.x
    MyResource:
      Type: AWS::Lambda::Function
      Properties:
        Code: path/to/file
  `;
    fsPrepCommon(template);
    const plugin = new SamPlugin();

    const entries = plugin.entryFor("default", "", "template.yaml", template, "app");
    expect(entries.samConfigs[0]?.templateYml?.Resources?.MyResource?.Properties?.Code).toEqual("../../path/to/file");
  });

  test("DefinitionS3Location property for the AWS::AppSync::GraphQLSchema resource", () => {
    const template = `
  AWSTemplateFormatVersion: "2010-09-09"
  Transform: AWS::Serverless-2016-10-31
  Resources:
    MyLambda:
      Type: AWS::Serverless::Function
      Properties:
        CodeUri: src/my-lambda
        Handler: app.handler
        Runtime: nodejs14.x
    MyResource:
      Type: AWS::AppSync::GraphQLSchema
      Properties:
        DefinitionS3Location: path/to/file
  `;
    fsPrepCommon(template);
    const plugin = new SamPlugin();

    const entries = plugin.entryFor("default", "", "template.yaml", template, "app");
    expect(entries.samConfigs[0]?.templateYml?.Resources?.MyResource?.Properties?.DefinitionS3Location).toEqual(
      "../../path/to/file"
    );
  });

  test("RequestMappingTemplateS3Location property for the AWS::AppSync::Resolver resource", () => {
    const template = `
  AWSTemplateFormatVersion: "2010-09-09"
  Transform: AWS::Serverless-2016-10-31
  Resources:
    MyLambda:
      Type: AWS::Serverless::Function
      Properties:
        CodeUri: src/my-lambda
        Handler: app.handler
        Runtime: nodejs14.x
    MyResource:
      Type: AWS::AppSync::Resolver
      Properties:
        RequestMappingTemplateS3Location: path/to/file
  `;
    fsPrepCommon(template);
    const plugin = new SamPlugin();

    const entries = plugin.entryFor("default", "", "template.yaml", template, "app");
    expect(
      entries.samConfigs[0]?.templateYml?.Resources?.MyResource?.Properties?.RequestMappingTemplateS3Location
    ).toEqual("../../path/to/file");
  });

  test("ResponseMappingTemplateS3Location property for the AWS::AppSync::Resolver resource", () => {
    const template = `
  AWSTemplateFormatVersion: "2010-09-09"
  Transform: AWS::Serverless-2016-10-31
  Resources:
    MyLambda:
      Type: AWS::Serverless::Function
      Properties:
        CodeUri: src/my-lambda
        Handler: app.handler
        Runtime: nodejs14.x
    MyResource:
      Type: AWS::AppSync::Resolver
      Properties:
        ResponseMappingTemplateS3Location: path/to/file
  `;
    fsPrepCommon(template);
    const plugin = new SamPlugin();

    const entries = plugin.entryFor("default", "", "template.yaml", template, "app");
    expect(
      entries.samConfigs[0]?.templateYml?.Resources?.MyResource?.Properties?.ResponseMappingTemplateS3Location
    ).toEqual("../../path/to/file");
  });

  test("DefinitionUri property for the AWS::Serverless::Api resource", () => {
    const template = `
  AWSTemplateFormatVersion: "2010-09-09"
  Transform: AWS::Serverless-2016-10-31
  Resources:
    MyLambda:
      Type: AWS::Serverless::Function
      Properties:
        CodeUri: src/my-lambda
        Handler: app.handler
        Runtime: nodejs14.x
    MyResource:
      Type: AWS::Serverless::Api
      Properties:
        DefinitionUri: path/to/file
  `;
    fsPrepCommon(template);
    const plugin = new SamPlugin();

    const entries = plugin.entryFor("default", "", "template.yaml", template, "app");
    expect(entries.samConfigs[0]?.templateYml?.Resources?.MyResource?.Properties?.DefinitionUri).toEqual(
      "../../path/to/file"
    );
  });

  test("Location parameter for the AWS::Include transform", () => {
    const template = `
  AWSTemplateFormatVersion: "2010-09-09"
  Transform: AWS::Serverless-2016-10-31
  Resources:
    MyLambda:
      Type: AWS::Serverless::Function
      Properties:
        CodeUri: src/my-lambda
        Handler: app.handler
        Runtime: nodejs14.x
    MyResource:
      Type: AWS::Include
      Properties:
        Location: path/to/file
  `;
    fsPrepCommon(template);
    const plugin = new SamPlugin();

    const entries = plugin.entryFor("default", "", "template.yaml", template, "app");
    expect(entries.samConfigs[0]?.templateYml?.Resources?.MyResource?.Properties?.Location).toEqual(
      "../../path/to/file"
    );
  });

  test("SourceBundle property for the AWS::ElasticBeanstalk::ApplicationVersion resource", () => {
    const template = `
  AWSTemplateFormatVersion: "2010-09-09"
  Transform: AWS::Serverless-2016-10-31
  Resources:
    MyLambda:
      Type: AWS::Serverless::Function
      Properties:
        CodeUri: src/my-lambda
        Handler: app.handler
        Runtime: nodejs14.x
    MyResource:
      Type: AWS::ElasticBeanstalk::ApplicationVersion
      Properties:
        SourceBundle: path/to/file
  `;
    fsPrepCommon(template);
    const plugin = new SamPlugin();

    const entries = plugin.entryFor("default", "", "template.yaml", template, "app");
    expect(entries.samConfigs[0]?.templateYml?.Resources?.MyResource?.Properties?.SourceBundle).toEqual(
      "../../path/to/file"
    );
  });

  test("TemplateURL property for the AWS::CloudFormation::Stack resource", () => {
    const template = `
  AWSTemplateFormatVersion: "2010-09-09"
  Transform: AWS::Serverless-2016-10-31
  Resources:
    MyLambda:
      Type: AWS::Serverless::Function
      Properties:
        CodeUri: src/my-lambda
        Handler: app.handler
        Runtime: nodejs14.x
    MyResource:
      Type: AWS::CloudFormation::Stack
      Properties:
        TemplateURL: path/to/file
  `;
    fsPrepCommon(template);
    const plugin = new SamPlugin();

    const entries = plugin.entryFor("default", "", "template.yaml", template, "app");
    expect(entries.samConfigs[0]?.templateYml?.Resources?.MyResource?.Properties?.TemplateURL).toEqual(
      "../../path/to/file"
    );
  });

  test("Command.ScriptLocation property for the AWS::Glue::Job resource", () => {
    const template = `
  AWSTemplateFormatVersion: "2010-09-09"
  Transform: AWS::Serverless-2016-10-31
  Resources:
    MyLambda:
      Type: AWS::Serverless::Function
      Properties:
        CodeUri: src/my-lambda
        Handler: app.handler
        Runtime: nodejs14.x
    MyResource:
      Type: AWS::Glue::Job
      Properties:
        Command:
          ScriptLocation: path/to/file
  `;
    fsPrepCommon(template);
    const plugin = new SamPlugin();

    const entries = plugin.entryFor("default", "", "template.yaml", template, "app");
    expect(entries.samConfigs[0]?.templateYml?.Resources?.MyResource?.Properties?.Command?.ScriptLocation).toEqual(
      "../../path/to/file"
    );
  });

  test("DefinitionS3Location property for the AWS::StepFunctions::StateMachine resource", () => {
    const template = `
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31
Resources:
  MyLambda:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/my-lambda
      Handler: app.handler
      Runtime: nodejs14.x
  MyResource:
    Type: AWS::StepFunctions::StateMachine
    Properties:
      DefinitionS3Location: path/to/file
`;
    fsPrepCommon(template);
    const plugin = new SamPlugin();

    const entries = plugin.entryFor("default", "", "template.yaml", template, "app");
    expect(entries.samConfigs[0]?.templateYml?.Resources?.MyResource?.Properties?.DefinitionS3Location).toEqual(
      "../../path/to/file"
    );
  });
});

describe("Property paths are not re-written when they are objects", () => {
  test("BodyS3Location property for the AWS::ApiGateway::RestApi resource", () => {
    const template = `
  AWSTemplateFormatVersion: "2010-09-09"
  Transform: AWS::Serverless-2016-10-31
  Resources:
    MyLambda:
      Type: AWS::Serverless::Function
      Properties:
        CodeUri: src/my-lambda
        Handler: app.handler
        Runtime: nodejs14.x
    MyResource:
      Type: AWS::ApiGateway::RestApi
      Properties:
        BodyS3Location:
          Bucket: bucketname
  `;
    fsPrepCommon(template);
    const plugin = new SamPlugin();

    const entries = plugin.entryFor("default", "", "template.yaml", template, "app");
    expect(entries.samConfigs[0]?.templateYml?.Resources?.MyResource?.Properties?.BodyS3Location).toEqual({
      Bucket: "bucketname",
    });
  });

  test("Code property for the AWS::Lambda::Function resource", () => {
    const template = `
  AWSTemplateFormatVersion: "2010-09-09"
  Transform: AWS::Serverless-2016-10-31
  Resources:
    MyLambda:
      Type: AWS::Serverless::Function
      Properties:
        CodeUri: src/my-lambda
        Handler: app.handler
        Runtime: nodejs14.x
    MyResource:
      Type: AWS::Lambda::Function
      Properties:
        Code:
          S3Bucket: bucketname
  `;
    fsPrepCommon(template);
    const plugin = new SamPlugin();

    const entries = plugin.entryFor("default", "", "template.yaml", template, "app");
    expect(entries.samConfigs[0]?.templateYml?.Resources?.MyResource?.Properties?.Code).toEqual({
      S3Bucket: "bucketname",
    });
  });

  test("DefinitionS3Location property for the AWS::AppSync::GraphQLSchema resource", () => {
    const template = `
  AWSTemplateFormatVersion: "2010-09-09"
  Transform: AWS::Serverless-2016-10-31
  Resources:
    MyLambda:
      Type: AWS::Serverless::Function
      Properties:
        CodeUri: src/my-lambda
        Handler: app.handler
        Runtime: nodejs14.x
    MyResource:
      Type: AWS::AppSync::GraphQLSchema
      Properties:
        DefinitionS3Location: s3://path/to/file
  `;
    fsPrepCommon(template);
    const plugin = new SamPlugin();

    const entries = plugin.entryFor("default", "", "template.yaml", template, "app");
    expect(entries.samConfigs[0]?.templateYml?.Resources?.MyResource?.Properties?.DefinitionS3Location).toEqual(
      "s3://path/to/file"
    );
  });

  test("RequestMappingTemplateS3Location property for the AWS::AppSync::Resolver resource", () => {
    const template = `
  AWSTemplateFormatVersion: "2010-09-09"
  Transform: AWS::Serverless-2016-10-31
  Resources:
    MyLambda:
      Type: AWS::Serverless::Function
      Properties:
        CodeUri: src/my-lambda
        Handler: app.handler
        Runtime: nodejs14.x
    MyResource:
      Type: AWS::AppSync::Resolver
      Properties:
        RequestMappingTemplateS3Location: s3://path/to/file
  `;
    fsPrepCommon(template);
    const plugin = new SamPlugin();

    const entries = plugin.entryFor("default", "", "template.yaml", template, "app");
    expect(
      entries.samConfigs[0]?.templateYml?.Resources?.MyResource?.Properties?.RequestMappingTemplateS3Location
    ).toEqual("s3://path/to/file");
  });

  test("ResponseMappingTemplateS3Location property for the AWS::AppSync::Resolver resource", () => {
    const template = `
  AWSTemplateFormatVersion: "2010-09-09"
  Transform: AWS::Serverless-2016-10-31
  Resources:
    MyLambda:
      Type: AWS::Serverless::Function
      Properties:
        CodeUri: src/my-lambda
        Handler: app.handler
        Runtime: nodejs14.x
    MyResource:
      Type: AWS::AppSync::Resolver
      Properties:
        ResponseMappingTemplateS3Location: s3://path/to/file
  `;
    fsPrepCommon(template);
    const plugin = new SamPlugin();

    const entries = plugin.entryFor("default", "", "template.yaml", template, "app");
    expect(
      entries.samConfigs[0]?.templateYml?.Resources?.MyResource?.Properties?.ResponseMappingTemplateS3Location
    ).toEqual("s3://path/to/file");
  });

  // TODO
  test("DefinitionUri property for the AWS::Serverless::Api resource", () => {
    const template = `
  AWSTemplateFormatVersion: "2010-09-09"
  Transform: AWS::Serverless-2016-10-31
  Resources:
    MyLambda:
      Type: AWS::Serverless::Function
      Properties:
        CodeUri: src/my-lambda
        Handler: app.handler
        Runtime: nodejs14.x
    MyResource:
      Type: AWS::Serverless::Api
      Properties:
        DefinitionUri: path/to/file
  `;
    fsPrepCommon(template);
    const plugin = new SamPlugin();

    const entries = plugin.entryFor("default", "", "template.yaml", template, "app");
    expect(entries.samConfigs[0]?.templateYml?.Resources?.MyResource?.Properties?.DefinitionUri).toEqual(
      "../../path/to/file"
    );
  });

  test("Location parameter for the AWS::Include transform", () => {
    const template = `
  AWSTemplateFormatVersion: "2010-09-09"
  Transform: AWS::Serverless-2016-10-31
  Resources:
    MyLambda:
      Type: AWS::Serverless::Function
      Properties:
        CodeUri: src/my-lambda
        Handler: app.handler
        Runtime: nodejs14.x
    MyResource:
      Type: AWS::Include
      Properties:
        Location: s3://path/to/file
  `;
    fsPrepCommon(template);
    const plugin = new SamPlugin();

    const entries = plugin.entryFor("default", "", "template.yaml", template, "app");
    expect(entries.samConfigs[0]?.templateYml?.Resources?.MyResource?.Properties?.Location).toEqual(
      "s3://path/to/file"
    );
  });

  test("SourceBundle property for the AWS::ElasticBeanstalk::ApplicationVersion resource", () => {
    const template = `
  AWSTemplateFormatVersion: "2010-09-09"
  Transform: AWS::Serverless-2016-10-31
  Resources:
    MyLambda:
      Type: AWS::Serverless::Function
      Properties:
        CodeUri: src/my-lambda
        Handler: app.handler
        Runtime: nodejs14.x
    MyResource:
      Type: AWS::ElasticBeanstalk::ApplicationVersion
      Properties:
        SourceBundle:
          S3Bucket: bucketname
  `;
    fsPrepCommon(template);
    const plugin = new SamPlugin();

    const entries = plugin.entryFor("default", "", "template.yaml", template, "app");
    expect(entries.samConfigs[0]?.templateYml?.Resources?.MyResource?.Properties?.SourceBundle).toEqual({
      S3Bucket: "bucketname",
    });
  });

  test("TemplateURL property for the AWS::CloudFormation::Stack resource", () => {
    const template = `
  AWSTemplateFormatVersion: "2010-09-09"
  Transform: AWS::Serverless-2016-10-31
  Resources:
    MyLambda:
      Type: AWS::Serverless::Function
      Properties:
        CodeUri: src/my-lambda
        Handler: app.handler
        Runtime: nodejs14.x
    MyResource:
      Type: AWS::CloudFormation::Stack
      Properties:
        TemplateURL: s3://path/to/file
  `;
    fsPrepCommon(template);
    const plugin = new SamPlugin();

    const entries = plugin.entryFor("default", "", "template.yaml", template, "app");
    expect(entries.samConfigs[0]?.templateYml?.Resources?.MyResource?.Properties?.TemplateURL).toEqual(
      "s3://path/to/file"
    );
  });

  test("Command.ScriptLocation property for the AWS::Glue::Job resource", () => {
    const template = `
  AWSTemplateFormatVersion: "2010-09-09"
  Transform: AWS::Serverless-2016-10-31
  Resources:
    MyLambda:
      Type: AWS::Serverless::Function
      Properties:
        CodeUri: src/my-lambda
        Handler: app.handler
        Runtime: nodejs14.x
    MyResource:
      Type: AWS::Glue::Job
      Properties:
        Command:
          ScriptLocation: s3://path/to/file
  `;
    fsPrepCommon(template);
    const plugin = new SamPlugin();

    const entries = plugin.entryFor("default", "", "template.yaml", template, "app");
    expect(entries.samConfigs[0]?.templateYml?.Resources?.MyResource?.Properties?.Command?.ScriptLocation).toEqual(
      "s3://path/to/file"
    );
  });

  test("DefinitionS3Location property for the AWS::StepFunctions::StateMachine resource", () => {
    const template = `
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31
Resources:
  MyLambda:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/my-lambda
      Handler: app.handler
      Runtime: nodejs14.x
  MyResource:
    Type: AWS::StepFunctions::StateMachine
    Properties:
      DefinitionS3Location:
        Bucket: bucketname
`;
    fsPrepCommon(template);
    const plugin = new SamPlugin();

    const entries = plugin.entryFor("default", "", "template.yaml", template, "app");
    expect(entries.samConfigs[0]?.templateYml?.Resources?.MyResource?.Properties?.DefinitionS3Location).toEqual({
      Bucket: "bucketname",
    });
  });
});

test("can be set at the function", () => {
  const template = `
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31
Resources:
  MyLambda:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/my-lambda
      Handler: app.handler
      Runtime: nodejs14.x
`;
  fsPrepCommon(template);
  const plugin = new SamPlugin();

  const entries = plugin.entryFor("default", "", "template.yaml", template, "app");
});

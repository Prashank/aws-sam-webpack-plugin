import SamPlugin from "../index";
import fs from "fs";
import path from "path";
import child_process from "child_process";

jest.mock("child_process");
jest.mock("fs");

const samTemplate = `
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
const samTemplateWithLayer = `
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
  LayerSharp:
    Type: AWS::Serverless::LayerVersion
    Metadata:
      BuildMethod: makefile
    Properties:
      LayerName: layer-sharp
      Description: Package sharp
      ContentUri: layers/sharp
      CompatibleRuntimes:
        - nodejs14.x
      RetentionPolicy: Retain
  LayerSharp2:
    Type: AWS::Serverless::LayerVersion
    Metadata:
      BuildMethod: makefile
    Properties:
      LayerName: layer-sharp2
      Description: Package sharp2
      ContentUri: ./layers/sharp2
      CompatibleRuntimes:
        - nodejs14.x
      RetentionPolicy: Retain
`;

test("Happy path with default constructor works", () => {
  // @ts-ignore
  fs.__clearMocks();
  // @ts-ignore
  fs.__setMockDirs(["."]);
  // @ts-ignore
  fs.__setMockFiles({ "./template.yaml": samTemplate });

  const plugin = new SamPlugin();

  const entryPoints = plugin.entry();

  let afterEmit: (_compilation: any) => void;

  plugin.apply({
    hooks: {
      afterEmit: {
        tap: (n: string, f: (_compilation: any) => void) => {
          afterEmit = f;
        },
        tapPromise: async (n: string, f: (_compilation: any) => Promise<void>) => {},
      },
    },
  });
  // @ts-ignore
  afterEmit(null);

  // @ts-ignore
  expect({ entryPoints, files: fs.__getMockWrittenFiles() }).toMatchSnapshot();
});

test("Happy path with empty options in the constructor works", () => {
  const plugin = new SamPlugin({});

  // @ts-ignore
  fs.__clearMocks();
  // @ts-ignore
  fs.__setMockDirs(["."]);
  // @ts-ignore
  fs.__setMockFiles({ "./template.yaml": samTemplate });

  const entryPoints = plugin.entry();

  let afterEmit: (_compilation: any) => void;

  plugin.apply({
    hooks: {
      afterEmit: {
        tap: (n: string, f: (_compilation: any) => void) => {
          afterEmit = f;
        },
        tapPromise: async (n: string, f: (_compilation: any) => Promise<void>) => {},
      },
    },
  });
  // @ts-ignore
  afterEmit(null);

  // Does create a .vscode folder
  // @ts-ignore
  expect(fs.__getMockMakedirs().includes(".vscode")).toBeTruthy();

  // @ts-ignore
  expect({ entryPoints, files: fs.__getMockWrittenFiles() }).toMatchSnapshot();
});

test("Happy path with empty options in the constructor works and an existing .vscode folder", () => {
  const plugin = new SamPlugin({});

  // @ts-ignore
  fs.__clearMocks();
  // @ts-ignore
  fs.__setMockDirs([".", ".vscode"]);
  // @ts-ignore
  fs.__setMockFiles({ "./template.yaml": samTemplate });

  const entryPoints = plugin.entry();

  let afterEmit: (_compilation: any) => void;

  plugin.apply({
    hooks: {
      afterEmit: {
        tap: (n: string, f: (_compilation: any) => void) => {
          afterEmit = f;
        },
        tapPromise: async (n: string, f: (_compilation: any) => Promise<void>) => {},
      },
    },
  });
  // @ts-ignore
  afterEmit(null);

  // Does not create a .vscode folder
  // @ts-ignore
  expect(fs.__getMockMakedirs().includes(".vscode")).toBeFalsy();

  // @ts-ignore
  expect({ entryPoints, files: fs.__getMockWrittenFiles() }).toMatchSnapshot();
});

test("Happy path with VS Code debugging disabled", () => {
  const plugin = new SamPlugin({ vscodeDebug: false });

  // @ts-ignore
  fs.__clearMocks();
  // @ts-ignore
  fs.__setMockDirs(["."]);
  // @ts-ignore
  fs.__setMockFiles({ "./template.yaml": samTemplate });

  const entryPoints = plugin.entry();

  let afterEmit: (_compilation: any) => void;

  plugin.apply({
    hooks: {
      afterEmit: {
        tap: (n: string, f: (_compilation: any) => void) => {
          afterEmit = f;
        },
        tapPromise: async (n: string, f: (_compilation: any) => Promise<void>) => {},
      },
    },
  });
  // @ts-ignore
  afterEmit(null);

  // Does not create a .vscode folder
  // @ts-ignore
  expect(fs.__getMockMakedirs().includes(".vscode")).toBeFalsy();

  // @ts-ignore
  expect({ entryPoints, files: fs.__getMockWrittenFiles() }).toMatchSnapshot();
});

const vscodeLaunchJson1 = `{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "CustomLambda",
      "type": "node",
      "request": "attach",
      "address": "localhost",
      "port": 5858,
      "localRoot": "\${workspaceFolder}/.aws-sam/build/CustomLambda",
      "remoteRoot": "/var/task",
      "protocol": "inspector",
      "stopOnEntry": false,
      "outFiles": [
        "\${workspaceFolder}/.aws-sam/build/CustomLambda/**/*.js"
      ],
      "sourceMaps": true,
      "skipFiles": [
        "/var/runtime/**/*.js",
        "<node_internals>/**/*.js"
      ]
    }
  ]
}`;
const vscodeLaunchJson2 = `{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "CustomLambda",
      "type": "node",
      "request": "attach",
      "address": "localhost",
      "port": 5858,
      "localRoot": "\${workspaceFolder}/.aws-sam/build/CustomLambda",
      "remoteRoot": "/var/task",
      "protocol": "inspector",
      "stopOnEntry": false,
      "outFiles": [
        "\${workspaceFolder}/.aws-sam/build/CustomLambda/**/*.js"
      ],
      "sourceMaps": true,
      "skipFiles": [
        "/var/runtime/**/*.js",
        "<node_internals>/**/*.js"
      ]
    },
    // BEGIN AwsSamPlugin
    {
      "name": "OldLambda",
      "type": "node",
      "request": "attach",
      "address": "localhost",
      "port": 5858,
      "localRoot": "\${workspaceFolder}/.aws-sam/build/OldLambda",
      "remoteRoot": "/var/task",
      "protocol": "inspector",
      "stopOnEntry": false,
      "outFiles": [
        "\${workspaceFolder}/.aws-sam/build/OldLambda/**/*.js"
      ],
      "sourceMaps": true,
      "skipFiles": [
        "/var/runtime/**/*.js",
        "<node_internals>/**/*.js"
      ]
    }
    // END AwsSamPlugin
  ]
}`;
const vscodeLaunchJsonTest = `{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "CustomLambda",
      "type": "node",
      "request": "attach",
      "address": "localhost",
      "port": 5858,
      "localRoot": "\${workspaceFolder}/.aws-sam/build/CustomLambda",
      "remoteRoot": "/var/task",
      "protocol": "inspector",
      "stopOnEntry": false,
      "outFiles": [
        "\${workspaceFolder}/.aws-sam/build/CustomLambda/**/*.js"
      ],
      "sourceMaps": true,
      "skipFiles": [
        "/var/runtime/**/*.js",
        "<node_internals>/**/*.js"
      ]
    },
    // BEGIN AwsSamPlugin
    {
      "name": "MyLambda",
      "type": "node",
      "request": "attach",
      "address": "localhost",
      "port": 5858,
      "localRoot": "\${workspaceFolder}/.aws-sam/build/MyLambda",
      "remoteRoot": "/var/task",
      "protocol": "inspector",
      "stopOnEntry": false,
      "outFiles": [
        "\${workspaceFolder}/.aws-sam/build/MyLambda/**/*.js"
      ],
      "sourceMaps": true,
      "skipFiles": [
        "/var/runtime/**/*.js",
        "<node_internals>/**/*.js"
      ]
    }
    // END AwsSamPlugin
  ]
}`;

test.each([
  [vscodeLaunchJson1, vscodeLaunchJsonTest],
  [vscodeLaunchJson2, vscodeLaunchJsonTest],
])("Happy build launch.json with replace old content", (srcData, testData) => {
  // @ts-ignore
  fs.__clearMocks();
  // @ts-ignore
  fs.__setMockDirs(["."]);
  // @ts-ignore
  fs.__setMockFiles({ "./template.yaml": samTemplate, ".vscode/launch.json": srcData });

  const plugin = new SamPlugin({ vscodeDebug: true });

  const entryPoints = plugin.entry();

  let afterEmit: (_compilation: any) => void;

  plugin.apply({
    hooks: {
      afterEmit: {
        tap: (n: string, f: (_compilation: any) => void) => {
          afterEmit = f;
        },
        tapPromise: async (n: string, f: (_compilation: any) => Promise<void>) => {},
      },
    },
  });
  // @ts-ignore
  afterEmit(null);

  // @ts-ignore
  const vscodeLaunchJsonContent = fs.__getMockWrittenFiles()[".vscode/launch.json"];

  expect(vscodeLaunchJsonContent).toEqual(testData);
});

test("Happy path with multiple projects works", () => {
  // @ts-ignore
  fs.__clearMocks();
  // @ts-ignore
  fs.__setMockDirs(["project-a", "project-b"]);
  // @ts-ignore
  fs.__setMockFiles({ "project-a/template.yaml": samTemplate, "project-b/template.yaml": samTemplate });

  const plugin = new SamPlugin({ projects: { a: "project-a", b: "project-b" } });
  const entryPoints = plugin.entry();

  let afterEmit: (_compilation: any) => void;

  plugin.apply({
    hooks: {
      afterEmit: {
        tap: (n: string, f: (_compilation: any) => void) => {
          afterEmit = f;
        },
        tapPromise: async (n: string, f: (_compilation: any) => Promise<void>) => {},
      },
    },
  });
  // @ts-ignore
  afterEmit(null);

  // @ts-ignore
  expect({ entryPoints, files: fs.__getMockWrittenFiles() }).toMatchSnapshot();
});

test("Happy path with multiple projects and different template names works", () => {
  // @ts-ignore
  fs.__clearMocks();
  // @ts-ignore
  fs.__setMockDirs(["project-a", "project-b"]);
  // @ts-ignore
  fs.__setMockFiles({ "project-a/template-a.yaml": samTemplate, "project-b/template-b.yaml": samTemplate });

  const plugin = new SamPlugin({ projects: { a: "project-a/template-a.yaml", b: "project-b/template-b.yaml" } });
  const entryPoints = plugin.entry();

  let afterEmit: (_compilation: any) => void;

  plugin.apply({
    hooks: {
      afterEmit: {
        tap: (n: string, f: (_compilation: any) => void) => {
          afterEmit = f;
        },
        tapPromise: async (n: string, f: (_compilation: any) => Promise<void>) => {},
      },
    },
  });
  // @ts-ignore
  afterEmit(null);

  // @ts-ignore
  expect({ entryPoints, files: fs.__getMockWrittenFiles() }).toMatchSnapshot();
});

test("Calling apply() before entry() throws an error", () => {
  // @ts-ignore
  fs.__clearMocks();
  // @ts-ignore
  fs.__setMockDirs(["."]);
  // @ts-ignore
  fs.__setMockFiles({ "./template.yaml": samTemplate });
  const plugin = new SamPlugin();
  let afterEmit: (_compilation: any) => void;

  plugin.apply({
    hooks: {
      afterEmit: {
        tap: (n: string, f: (_compilation: any) => void) => {
          afterEmit = f;
        },
        tapPromise: async (n: string, f: (_compilation: any) => Promise<void>) => {},
      },
    },
  });
  // @ts-ignore
  expect(() => afterEmit(null)).toThrowError("It looks like AwsSamPlugin.entry() was not called");
});

test("Happy path for filename() when the Lambda is found", () => {
  // @ts-ignore
  fs.__clearMocks();
  // @ts-ignore
  fs.__setMockDirs(["."]);
  // @ts-ignore
  fs.__setMockFiles({ "./template.yaml": samTemplate });

  const plugin = new SamPlugin();
  const entryPoints = plugin.entry();

  expect(plugin.filename({ chunk: { name: "MyLambda" } })).toEqual("./.aws-sam/build/MyLambda/app.js");
});

test("Fails when filename() is passed an invalid lambda name", () => {
  // @ts-ignore
  fs.__clearMocks();
  // @ts-ignore
  fs.__setMockDirs(["."]);
  // @ts-ignore
  fs.__setMockFiles({ "./template.yaml": samTemplate });

  const plugin = new SamPlugin();
  const entryPoints = plugin.entry();

  //console.log("XXX", plugin.filename({chunk: { name: "FakeLambda" }}));
  expect(() => plugin.filename({ chunk: { name: "FakeLambda" } })).toThrowError(
    "Unable to find filename for FakeLambda"
  );
});

test("Fails when there is no template.yaml or template.yml and you provided a directory", () => {
  // @ts-ignore
  fs.__clearMocks();
  // @ts-ignore
  fs.__setMockDirs(["."]);
  // // @ts-ignore
  // fs.__setMockFiles({ "./template.yaml": samTemplate });

  expect(() => {
    const plugin = new SamPlugin();
    plugin.entry();
  }).toThrowError("Could not find template.yaml or template.yml in .");
});

test("Happy path with an output file specified", () => {
  // @ts-ignore
  fs.__clearMocks();
  // @ts-ignore
  fs.__setMockDirs(["."]);
  // @ts-ignore
  fs.__setMockFiles({ "./template.yaml": samTemplate });

  const plugin = new SamPlugin({ outFile: "index" });
  const entryPoints = plugin.entry();

  let afterEmit: (_compilation: any) => void;

  plugin.apply({
    hooks: {
      afterEmit: {
        tap: (n: string, f: (_compilation: any) => void) => {
          afterEmit = f;
        },
        tapPromise: async (n: string, f: (_compilation: any) => Promise<void>) => {},
      },
    },
  });
  // @ts-ignore
  afterEmit(null);

  // @ts-ignore
  expect({ entryPoints, files: fs.__getMockWrittenFiles() }).toMatchSnapshot();
});

test("Happy exec make template with layers", async () => {
  // @ts-ignore
  fs.__clearMocks();
  // @ts-ignore
  fs.__setMockDirs(["."]);
  // @ts-ignore
  fs.__setMockFiles({ "./template.yaml": samTemplateWithLayer });

  const plugin = new SamPlugin({ outFile: "index" });
  const entryPoints = plugin.entry();

  // let afterEmit: (_compilation: any) => void;
  let afterEmitPromise: (_compilation: any) => Promise<void>;

  plugin.apply({
    hooks: {
      afterEmit: {
        tap: (n: string, f: (_compilation: any) => void) => {
          // afterEmit = f;
        },
        tapPromise: async (n: string, f: (_compilation: any) => Promise<void>) => {
          afterEmitPromise = f;
        },
      },
    },
  });

  const originalLog = console.log;
  console.log = jest.fn();
  const execMocked = child_process.exec as unknown as jest.Mock;
  execMocked.mockClear();
  // @ts-ignore
  await afterEmitPromise(null);
  console.log = originalLog;

  expect(execMocked.mock.calls.length).toBe(2);
  expect(execMocked.mock.calls[0][0]).toMatch(
    /make -C ".\/layers\/sharp" ARTIFACTS_DIR="[^"]+\/\.aws-sam\/build\/LayerSharp" build-LayerSharp/
  );
  expect(execMocked.mock.calls[1][0]).toMatch(
    /make -C ".\/layers\/sharp2" ARTIFACTS_DIR="[^"]+\/\.aws-sam\/build\/LayerSharp2" build-LayerSharp2/
  );
});

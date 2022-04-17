const fs = require("fs");
const config = require("./config.json");

function getFileData(filePath) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, "utf8", (error, data) => {
            if (error) {
                reject(error);
            } else {
                setTimeout(() => {
                    resolve(data);
                }, 3000);
            }
        });
    });
}

function getModuleMetadata(data) {
    const metadata = [];
    const functionDefinitionString = data.match(
        /export(\sdefault)?(\sfunction)(\s[a-zA-Z0-9]*)?(\s)?\((\s*)?[a-zA-Z0-9,:=\s]*\)/gm
    );

    functionDefinitionString.forEach((item) => {
        const functionName = item
            .match(/([a-zA-Z0-9]*)?(\s)?\(/g)[0]
            .replace(/\s?\(?/g, "");

        const parametersString = item
            .match(/\([a-zA-Z0-9,:=\s]*\)/g)[0]
            .replace(/\(?\)?/g, "")
            .replace(/\s/g, "");

        const parameters = parametersString.split(",").map((p) => {
            const parameter = p.replace(/=[a-zA-Z0-9'"\s]*/g, "").split(":");
            return {
                name: parameter[0],
                type: parameter[1],
            };
        });

        if (functionName !== "function") {
            metadata.push({
                name: functionName,
                parameters,
            });
        }
    });

    return metadata;
}

function createTestModule(metadata, filePath) {
    const fileName = filePath.match(/[a-zA-Z0-9]+\.ts/g)[0].split(".")[0];
    const testFileName = config.testFolderName + "/" + fileName + ".test.js";
    const testFilePath = filePath.replace(/[a-zA-Z0-9]+\.ts/g, testFileName);
    const testDirectory = testFilePath
        .split("/")
        .reverse()
        .slice(1)
        .reverse()
        .join("/");

    const filePathForRead = filePath.replace(".ts", "");
    const upLevelCount = config.testFolderName.split("/").length;
    const filePathForImport = [
        ...Array(upLevelCount).fill("./."),
        filePathForRead,
    ].join("");

    const content = createTestModuleContent(
        metadata,
        filePathForRead,
        filePathForImport
    );

    if (!fs.existsSync(testDirectory)) {
        fs.mkdirSync(testDirectory, { recursive: true });
    }

    fs.writeFileSync(testFilePath, content, { flag: "w" });
    console.log("✅ " + testFileName + " created successfully!");
}

function createTestModuleContent(metadata, filePathForRead, filePathForImport) {
    const functionNames = metadata.map(({ name }) => name);
    const functionNamesString = functionNames.join(", ");

    let content = `const {${functionNamesString}} = require("${filePathForImport}")`;

    metadata.forEach(({ name, parameters }) => {
        const module = require(filePathForRead);
        content += "\n";

        const arguments = parameters.map((parameter) => {
            if (parameter.type === "number") {
                return Math.ceil(Math.random() * 100);
            }
        });

        const argumentsString = arguments.join(", ");
        const expectedResult = module[name].apply(null, arguments);

        content += `
test("${name}", () => {
    expect(${name}(${argumentsString})).toBe(${expectedResult});
});`;
    });

    return content;
}

// Example
const filePath = "./examples.ts";
getFileData(filePath).then((data) => {
    const metadata = getModuleMetadata(data);
    createTestModule(metadata, filePath);
});

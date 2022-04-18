const fs = require("fs");
const path = require("path");
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
    // filePath: C:\path\to\folder\myModule.ts
    const currentPath = path.parse(filePath); // object
    const fileName = currentPath.name; // myModule
    const testFileName = fileName + ".test.js"; // myModule.test.js
    const testFilePath = path.join(
        currentPath.dir,
        config.testFolderName,
        testFileName
    ); // C:\path\to\folder\tests\myModule.test.js
    const testDirectory = path.join(currentPath.dir, config.testFolderName); // C:\path\to\folder\tests

    const filePathForRead = path.join(currentPath.dir, currentPath.name); // C:\path\to\folder\myModule
    const filePathForImport = path
        .relative(testDirectory, filePathForRead)
        .replace("\\", "/"); // ../myModule

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

        const args = parameters.map((parameter) => {
            if (parameter.type === "number") {
                return Math.ceil(Math.random() * 100);
            }
        });

        const argsString = args.join(", ");
        const expectedResult = module[name].apply(null, args);

        content += `
test("${name}", () => {
    expect(${name}(${argsString})).toBe(${expectedResult});
});`;
    });

    return content;
}

module.exports = function (filePath) {
    // TSvalidator(filePath)
    getFileData(filePath).then((data) => {
        const metadata = getModuleMetadata(data);
        createTestModule(metadata, filePath);
    });
};

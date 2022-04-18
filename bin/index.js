#! /usr/bin/env node

var { Command } = require("commander");
var cli = new Command();
var package = require("../package.json");
var path = require("path");
var generator = require("../lib");

cli.name(package.name)
    .description(package.description)
    .version(package.version)
    .usage("<option>");

cli.command("generate")
    .description("Generate tests for selected path")
    .argument("<path>", "file to generate tests for")
    .action(function (fileName) {
        var filePath = path.join(process.cwd(), fileName);
        generator(filePath);
    });

cli.parse(process.argv);

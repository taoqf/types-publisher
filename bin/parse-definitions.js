"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const yargs = require("yargs");
const get_definitely_typed_1 = require("./get-definitely-typed");
const common_1 = require("./lib/common");
const definition_parser_1 = require("./lib/definition-parser");
const definition_parser_worker_1 = require("./lib/definition-parser-worker");
const packages_1 = require("./lib/packages");
const test_runner_1 = require("./tester/test-runner");
const util_1 = require("./util/util");
if (!module.parent) {
    const singleName = yargs.argv.single;
    const options = common_1.Options.defaults;
    util_1.logUncaughtErrors(async () => {
        const dt = await get_definitely_typed_1.getDefinitelyTyped(options);
        if (singleName) {
            await single(singleName, dt);
        }
        else {
            await parseDefinitions(dt, options.parseInParallel
                ? { nProcesses: test_runner_1.parseNProcesses(), definitelyTypedPath: util_1.assertDefined(options.definitelyTypedPath) }
                : undefined);
        }
    });
}
async function parseDefinitions(dt, parallel) {
    const typesFS = dt.subDir("types");
    const packageNames = await util_1.filterNAtATimeOrdered(parallel ? parallel.nProcesses : 1, await typesFS.readdir(), name => typesFS.isDirectory(name));
    const typings = {};
    if (parallel) {
        await util_1.runWithChildProcesses({
            inputs: packageNames,
            commandLineArgs: [`${parallel.definitelyTypedPath}/types`],
            workerFile: definition_parser_worker_1.definitionParserWorkerFilename,
            nProcesses: parallel.nProcesses,
            handleOutput,
        });
    }
    else {
        for (const packageName of packageNames) {
            handleOutput({ data: await definition_parser_1.getTypingInfo(packageName, typesFS.subDir(packageName)), packageName });
        }
    }
    function handleOutput({ data, packageName }) {
        typings[packageName] = data;
    }
    await common_1.writeDataFile(packages_1.typesDataFilename, sorted(typings));
    return packages_1.AllPackages.from(typings, await packages_1.readNotNeededPackages(dt));
}
exports.default = parseDefinitions;
function sorted(obj) {
    const out = {};
    for (const key of Object.keys(obj).sort()) {
        out[key] = obj[key];
    }
    return out;
}
async function single(singleName, dt) {
    const data = await definition_parser_1.getTypingInfo(singleName, dt.subDir("types").subDir(singleName));
    const typings = { [singleName]: data };
    await common_1.writeDataFile(packages_1.typesDataFilename, typings);
    console.log(JSON.stringify(data, undefined, 4));
}
//# sourceMappingURL=parse-definitions.js.map
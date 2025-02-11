import { promises as fs } from "fs";
import path from "path";
import jsyaml from "js-yaml";
import chalk from "chalk";
import simpleGit from "simple-git";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VALID_THEMES = ["berry", "blue", "ceramic", "green", "orange", "turquoise"];
let githubUsernames = new Set();

const walk = async (dir) => {
    try {
        const list = await fs.readdir(dir);
        const files = await Promise.all(
            list.map(async (file) => {
                const fullPath = path.resolve(dir, file);
                const stat = await fs.stat(fullPath);
                return stat.isDirectory() ? walk(fullPath) : fullPath;
            })
        );
        return files.flat();
    } catch (err) {
        console.error(chalk.red(`Error reading directory / Error al leer el directorio: ${dir}`), err);
        return [];
    }
};

const parseYamlFile = async (filePath) => {
    try {
        const content = await fs.readFile(filePath, "utf8");
        return jsyaml.load(content);
    } catch (error) {
        throw new Error(`Failed to parse YAML file / No se pudo analizar el archivo YAML: ${filePath}`);
    }
};

const validateProfiles = async (profiles) => {
    let errors = [];

    await Promise.all(
        profiles.map(async (filePath) => {
            console.log(`\nValidating file / Validando archivo: ${chalk.cyan(filePath)}`);

            try {
                const yamlData = await parseYamlFile(filePath);
                const fileName = path.basename(filePath, path.extname(filePath)).toLowerCase();

                if (!yamlData.basic_info?.github) {
                    errors.push({ File: fileName, Error: "Missing GitHub username / Falta el nombre de usuario de GitHub" });
                    return;
                }

                if (yamlData.template !== "online-cv") {
                    errors.push({ File: fileName, Error: "Invalid template, must be 'online-cv' / Plantilla inválida, debe ser 'online-cv'" });
                }

                if (!yamlData.skin || !VALID_THEMES.includes(yamlData.skin)) {
                    errors.push({
                        File: fileName,
                        Error: `Invalid or missing skin / Skin inválido o faltante. Available skins / Skins disponibles: ${VALID_THEMES.join(", ")}`,
                    });
                }

                const githubUsername = yamlData.basic_info.github.toLowerCase();

                if (fileName !== githubUsername) {
                    errors.push({
                        File: fileName,
                        Error: `GitHub username '${yamlData.basic_info.github}' does not match file name '${fileName}' / El nombre de usuario de GitHub '${yamlData.basic_info.github}' no coincide con el nombre del archivo '${fileName}'`,
                    });
                }

                if (githubUsernames.has(githubUsername)) {
                    errors.push({ File: fileName, Error: `Duplicated GitHub username / Nombre de usuario de GitHub duplicado: ${yamlData.basic_info.github}` });
                } else {
                    githubUsernames.add(githubUsername);
                }
            } catch (error) {
                errors.push({ File: filePath, Error: error.message });
            }
        })
    );

    if (errors.length > 0) {
        console.log(chalk.red.bold("\nERRORS FOUND IN YAML FILES / ERRORES ENCONTRADOS EN ARCHIVOS YAML"));
        console.table(errors);
        console.log(chalk.red("Please check and fix the errors before proceeding. / Por favor, revisa y corrige los errores antes de continuar."));
        process.exit(1);
    } else {
        console.log(chalk.green.bold("\nAll YAML files are valid / Todos los archivos YAML son válidos"));
    }
};

const checkGitStatus = async (workingDir) => {
    console.log("Checking git status for non-YML files... / Verificando el estado de Git para archivos que no son YML...");
    try {
        const git = simpleGit(workingDir);
        const status = await git.status();
        const nonYMLFiles = status.files.filter(
            (f) => !f.path.endsWith(".yml") && !["package.json", "package-lock.json"].includes(f.path)
        );

        if (nonYMLFiles.length > 0) {
            console.log(chalk.red("\nThe following non-YML files have been modified: / Los siguientes archivos que no son YML han sido modificados:"));
            console.table(nonYMLFiles.map((f) => ({ File: f.path })));
            console.log(chalk.red("Use 'git checkout <path/to/file>' to revert changes. / Usa 'git checkout <ruta/del/archivo>' para revertir los cambios."));
            process.exit(1);
        }
    } catch (error) {
        console.error(chalk.red(`\nFailed to check Git status / Error al verificar el estado de Git: ${error.message}`));
        process.exit(1);
    }
};

(async () => {
    try {
        await checkGitStatus(__dirname);
        const yamlFiles = await walk("./site/resumes/");
        if (yamlFiles.length === 0) {
            console.log(chalk.red("\nNo YAML files found in ./site/resumes/ / No se encontraron archivos YAML en ./site/resumes/"));
            process.exit(1);
        }
        await validateProfiles(yamlFiles);
    } catch (error) {
        console.log(chalk.red("\nERROR DETECTED IN PROCESSING / ERROR DETECTADO EN EL PROCESO"));
        console.error(error.message);
        process.exit(1);
    }
})();
import fs from "fs";
import path from "path";
import jsyaml from "js-yaml";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const walk = async (dir) => {
  let results = [];
  try {
    const list = await fs.promises.readdir(dir);
    await Promise.all(
      list.map(async (file) => {
        const fullPath = path.resolve(dir, file);
        const stat = await fs.promises.stat(fullPath);
        if (stat.isDirectory()) {
          results = results.concat(await walk(fullPath));
        } else {
          results.push(fullPath);
        }
      })
    );
  } catch (err) {
    console.error(`Error scanning directory: ${dir}`, err);
    process.exit(1);
  }
  return results;
};

const buildResumesData = (resumes) =>
  resumes.map((resumeYmlContent) => {
    const { fileName, yaml } = loadYML(resumeYmlContent);
    return { ...yaml };
  });

const createContentJSON = (content, fileName) => {
  const outputPath = path.join(__dirname, "site/static/");
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }
  fs.writeFileSync(
    path.join(outputPath, `${fileName}.json`),
    JSON.stringify(content, null, 2)
  );
};

const loadYML = (pathToFile) => {
  try {
    const content = fs.readFileSync(pathToFile, "utf8");
    const yaml = jsyaml.load(content);
    const fileName = path.basename(pathToFile, path.extname(pathToFile)).toLowerCase();

    if (!yaml) throw new Error(`The file ${fileName}.yml was impossible to parse`);
    
    return { fileName, yaml };
  } catch (error) {
    console.error(error);
    return null;
  }
};

(async () => {
  try {
    const results = await walk("site/resumes/");
    const resumes = buildResumesData(results);
    createContentJSON(resumes, "resumes");
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
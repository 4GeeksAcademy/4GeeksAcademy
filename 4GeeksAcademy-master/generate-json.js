const fs = require('fs');
const path = require('path');
const jsyaml = require("js-yaml");
// const fm = require('front-matter');


// open a directory and find all the files inside (recursively)
const walk = function(dir, done) {
  var results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    var pending = list.length;
    if (!pending) return done(null, results);
    list.forEach(function(file) {
      file = path.resolve(dir, file);
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function(err, res) {
            results = results.concat(res);
            if (!--pending) done(null, results);
          });
        } else {
          results.push(file);
          if (!--pending) done(null, results);
        }
      });
    });
  });
};


const buildResumesData = (resumes) => resumes
  .map(resumeYmlContent => {
    const { fileName, yaml } = loadYML(resumeYmlContent);
    return {
        ...yaml
    };
});

const createContentJSON =(content, fileName) => {
    const outputPath = "site/static/"
    if (!fs.existsSync(outputPath)) fs.mkdirSync(outputPath);
    else console.error("Output path does not exist, creating it: ", outputPath)

    fs.writeFileSync(outputPath+fileName+".json", JSON.stringify(content));
};

walk('site/resumes/', function(err, results) {
    if (err){
        console.log("Error scanning resume (yml) files");
        process.exit(1);
    } 
    
    try{
      // "bildResumeData" will open the resume yml and convert it to an object
      const resumes = buildResumesData(results);
      // console.log(resumes)

        
        createContentJSON(resumes, "resumes");
        // console.log("The /public/static/api/lessons.json file was created!");
        process.exit(0);
    }
    catch(error){
        console.log(error);
        process.exit(1);
    }
});


const loadYML = (pathToFile) => {
  const content = fs.readFileSync(pathToFile, "utf8");
  try {
    const yaml = jsyaml.load(content);

    // get the file name from the path
    const fileName = pathToFile
      .replace(/^.*[\\\/]/, "")
      .split(".")
      .slice(0, -1)
      .join(".")
      .toLowerCase();
    
    //if the yml parsing succeeded
    if (typeof yaml == "undefined" || !yaml)
      throw new Error(`The file ${fileName}.yml was impossible to parse`.red);
    
    return { fileName, yaml };
  } catch (error) {
    console.error(error);
    return null;
  }
};
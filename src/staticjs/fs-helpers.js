import yaml from "js-yaml";
import { readdir, stat, unlink, readFile } from 'fs/promises';
import path from 'path';
import {createWriteStream, existsSync} from 'fs';
import papaparse from 'papaparse';


const keepers = [
    '_index.md', 'math.md', 'coding.md', 'robotics.md', 
    'chess.md', 'science.md', 'ai.md', 'game-development.md'
];

const RICH_RESULTS_PATH = path.join( process.cwd(), 'src', 'layouts', 'partials', "rich-search-results");
const CLASSES_MD_PATH = path.join(process.cwd(), 'src', 'content', 'english', 'classes');
const AI_GEN_PATH = path.join(process.cwd(), 'src', 'staticjs', 'ai-gen');


export async function cleanUpHugoFiles() {
    await deleteFiles(RICH_RESULTS_PATH);
    await deleteFiles(CLASSES_MD_PATH);
}

export async function cleanUpAiGen() {
     await deleteFiles(AI_GEN_PATH);
}

export async function writeJson( fileName, content, overwrite ) {
    const folderPath = path.join(AI_GEN_PATH);
    const filePath = path.join(folderPath, fileName);
    if (existsSync(filePath) && !overwrite) {
        
    } else {
        
        const stream = createWriteStream(filePath, { flags: "w" });
        await stream.write(JSON.stringify(content, null, 2), "utf8");
        stream.close();
    }
}

export async function readJson(fileName) {
    const folderPath = path.join(AI_GEN_PATH);
    const filePath = path.join(folderPath, fileName);
    let text;
    try {
        text = await readFile(filePath, "utf8");
    } catch (err) {
        err.message = `Failed to read JSON file at ${filePath}: ${err.message}`;
        throw err;
    }

    try {
        return JSON.parse(text);
    } catch (err) {
        err.message = `Invalid JSON in ${filePath}: ${err.message}`;
        throw err;
    }
}

async function deleteFiles(folderPath) {
    try {
        const files = await readdir(folderPath);
        for (const file of files) {
            if (!keepers.includes(file)) {
                console.log(`Deleting file: ${file}`);
                const filePath = path.join(folderPath, file);
                const fileStats = await stat(filePath);
                
                if (fileStats.isFile()) {
                    await unlink(filePath);
                    console.log(`Deleted file: ${filePath}`);
                }
            } else {
                console.log(`Keeping file: ${file}`);
            }
        }
    } catch (err) {
        console.error('Error during cleanup:', err);
    }
}

export async function writeMdFile(fileName, content) {
    const folderPath = path.join(CLASSES_MD_PATH); // Ensure CLASSES_MD_PATH is a valid, accessible directory path
    const filePath = path.join(folderPath, fileName);
    const yamlText = yaml.dump(content);
    // Create a writable stream for the file
    const stream = createWriteStream(filePath, { flags: "w" });
    try {
        // Write the YAML frontmatter
        stream.write("---\n");
        stream.write(yamlText);
        stream.write("---\n\n"); // Ensure proper formatting for Markdown files

        // Return a promise that resolves when the stream is closed
        await new Promise((resolve, reject) => {
            stream.on("finish", resolve);
            stream.on("error", reject);
            stream.end(); // End the stream (flush and close it)
        });

        // Return the file path for confirmation
        return filePath;
    } catch (error) {
        // Handle any errors that occur during the process
        stream.destroy(); // Ensure the stream is destroyed if an error occurs
        throw new Error(`Failed to write file: ${filePath}. Error: ${error.message}`);
    }
}

export async function writePartialFile(fileName, content) {
    // Resolve folder path relative to project root (cwd)
    const folderPath = path.join(RICH_RESULTS_PATH);
    const filePath = path.join(folderPath, fileName);

    // Create write stream for the target file
    const stream = createWriteStream(filePath, { flags: "w" });

    // Start the script tag for JSON-LD (Schema.org)
    stream.write('<script type="application/ld+json">\n');

    typeof content === "string"
        ? JSON.stringify(JSON.parse(content), null, 2)
        : JSON.stringify(content, null, 2);

    stream.write(content);
    stream.write("\n</script>\n");

    // Return a promise that resolves when the stream is closed
    await new Promise((resolve, reject) => {
        stream.on("finish", resolve);
        stream.on("error", reject);
        stream.end(); // end flushes and closes the stream
    });
    return filePath;
}


export function readCsvFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file provided'));
    papaparse.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: ({ data }) => resolve(data),
      error: (err) => reject(err),
    });
  });
}
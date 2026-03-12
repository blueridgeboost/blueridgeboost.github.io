import yaml from "js-yaml";
import { readdir, stat, unlink, readFile } from 'fs/promises';
import path from 'path';
import {createWriteStream, existsSync} from 'fs';
import papaparse from 'papaparse';
import fs from 'fs';

const keepers = [
    '_index.md', 'math.md', 'coding.md', 'robotics.md', 
    'chess.md', 'science.md', 'ai.md', 'game-development.md',
    'kids.md', 'teens.md', 'tweens.md'
];

const RICH_RESULTS_PATH = path.join( process.cwd(), 'src', 'layouts', 'partials', "rich-search-results");
const CLASSES_MD_PATH = path.join(process.cwd(), 'src', 'content', 'english', 'classes');
const AI_GEN_PATH = path.join(process.cwd(), 'scripts', 'classes', 'aiGen');


export async function cleanUpHugoFiles() {
    await deleteFiles(RICH_RESULTS_PATH);
    await deleteFiles(CLASSES_MD_PATH);
}

export async function cleanUpAiGen() {
     await deleteFiles(AI_GEN_PATH);
}

export async function writeJson( fileName, content, overwrite ) {
    if (existsSync(fileName) && !overwrite) {
        
    } else {
        
        const stream = createWriteStream(fileName, { flags: "w" });
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


export async function readCsvDataFromPath(path) {
  const csv = await readFile(path, 'utf8');
  const { data, errors, meta } = papaparse.parse(csv, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });
  if (errors?.length) {
    console.error('Papa errors:', errors);
  }
  return data;
}

export async function deleteCsvs(dir) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  await Promise.all(entries.map(async e => {
    if (e.isFile() && e.name.toLowerCase().endsWith('.csv')) {
        await fs.promises.unlink(`${dir}${e.name}`);
        console.log(`Deleted ${dir}${e.name}`);
    }
  }));
}

export async function writeDataToCsv(data, fileName) {
    // Convert data to CSV format using PapaParse 
    const csv = papaparse.unparse(data, {
        header: true, // Include headers in the CSV
        quotes: true, // Quote all fields for safety
    });

    // Write the CSV content to a file
    fs.writeFileSync(fileName, csv, 'utf8', (err) => {
        if (err) {
            console.error('Error writing CSV file:', err);
        } else {
            console.log(`CSV file created at ${fileName}`);
        }
    });
    console.log(`Wrote ${data.length} records to ${fileName}`);
}


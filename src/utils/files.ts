/**
 * local.ts
 * version 1.0.0
 * 
 * Created on the 09/05/2023
 */

import path from 'path'
import fs from 'fs'
import axios from "axios"
import { isArrayValid, isStringValid } from './main';

const computerFolder = "Documents"

/** 
 * @param path e.g. "i/9nf5o2sxIqBVrmY8mbE0HJFU/sky.jpg 
 * @returns e.g. { fileName: "sky.jpg", folders: ["i", "9nf5o2sxIqBVrmY8mbE0HJFU"]  }
 */
function extractFileNameAndFolders(filePath: string) {
    const segments = filePath.split("/");
    const fileName = segments.pop() ?? null;
    const folders = segments.filter((segment) => segment.length > 0);
    return { fileName, folders };
}

/** 
 * @param filePath The file path where the JSON file is saved, e.g., "data/folder/file.json".
 * @returns If the file does not exist, it will return null. If the file exists, the data will be returned.
 */
export function readLocalFile(fileName: string): any | null {

    // CHECK 
    const { fileName: fn, folders } = extractFileNameAndFolders(fileName);
    if (!isStringValid(fn) || !fn) return null;

    // 1 - GET FILE PATH (locally)
    let currentPath = path.join(process.env.HOME ?? "", computerFolder);
    for (const folderName of folders) {
        currentPath = path.join(currentPath, folderName);
        if (!fs.existsSync(currentPath)) {
            return null;
        }
    }
    const localFilePath = path.join(currentPath, fn);

    // 2 - error file doesn't exist
    if (!fs.existsSync(localFilePath)) {
        return null;
    }

    // 3 - GET DATA and RETURN IT IN THE CORRECT FORMAT
    const fileBuffer = fs.readFileSync(localFilePath),
        fileContent = fileBuffer.toString(),
        data = JSON.parse(fileContent);
    return data
}

/** The file is stored on the hardware. For instance images uploaded to the server using Mutler. */
export function readLocalFileBuffer(path: string) {
    return new Promise<Buffer>((resolve, reject) => {
        fs.readFile(path, (err, buffer) => {
            if (err) {
                console.error('Error reading file:', err);
                reject('Error reading file');
            } else {
                resolve(buffer);
            }
        });
    })
}

/**
 * @param data The JSON data to be saved. Can be a single JS object or an array of JS objects.
 * @param filePath The file path where the JSON file should be saved, e.g., "data/folder/file.json".
 * If the file does not exist, it will be created. If the file exists, the data will be appended to the file.
 * @returns The absolute path of the saved file.
 */
export function updateJSONOnLocalFile(data: { [key: string]: any }, filePath: string, action: "update" | "overwritte" = "update") {
    return new Promise<string>((resolve, reject) => {
        try {
            // CHECK 
            const { fileName, folders } = extractFileNameAndFolders(filePath);
            if (!isStringValid(fileName) || !fileName) return reject("bad-file-name");

            // 1 - GET ABSOLUTE LOCAL PATH
            let currentPath = path.join(process.env.HOME ?? "", computerFolder);
            for (const folder of folders) {
                currentPath = path.join(currentPath, folder);
                if (!fs.existsSync(currentPath)) {
                    fs.mkdirSync(currentPath);
                }
            }
            const localFilePath = path.join(currentPath, fileName);

            // 2 - GET PREVIOUS DATA
            const prevFileContent = fs.existsSync(localFilePath)
                ? fs.readFileSync(localFilePath).toString()
                : '[]';
            var localData: any[] = [];
            try {
                localData = JSON.parse(prevFileContent);
            } catch (error) { }

            // 3 - SAVE FRESH DATA (locally)
            const newData = isArrayValid(data) ? data : [data]
            const allFreshData = action === "update" ? newData.concat(localData) : newData
            const jsonIndentation = 2;
            fs.writeFileSync(localFilePath, JSON.stringify(allFreshData, null, jsonIndentation));

            // OUTPUT
            resolve(`✅ updated ${localFilePath}`);
        } catch (error) {
            reject(error);
        }
    });
}

/** 
 * @param filePath e.g. "i/9nf5o2sxIqBVrmY8mbE0HJFU/sky.jpg"
 */
export function saveImageOnLocalFile(imgData: { imgUrl?: string, imgBuffer?: Buffer }, filePath: string) {
    return new Promise<string>(async (resolve, reject) => {
        try {

            // CHECK 
            const { fileName, folders } = extractFileNameAndFolders(filePath)
            if (!isStringValid(fileName) || !fileName) return reject("bad-file-name")

            // 1 - GET IMAGE 
            var imageBuffer: Buffer
            if (imgData.imgBuffer) imageBuffer = imgData.imgBuffer
            else if (imgData.imgUrl) {
                const response = await axios.get(imgData.imgUrl, { responseType: "arraybuffer" })
                imageBuffer = Buffer.from(response.data, "binary")
            }
            else return reject("missing-image-data")

            // 2 - GET ABSOLUTE LOCAL PATH
            let currentPath = path.join(process.env.HOME ?? "", computerFolder);
            for (const folder of folders) {
                currentPath = path.join(currentPath, folder);
                if (!fs.existsSync(currentPath)) {
                    fs.mkdirSync(currentPath);
                }
            }
            const localFilePath = path.join(currentPath, fileName);

            // 3 - SAVE IMAGE ON LOCAL FILE
            fs.writeFileSync(localFilePath, imageBuffer);
            resolve(`✅ image saved at ${localFilePath}`)

        } catch (error) {
            reject(error)
        }
    })
}

export function writeLocalFile(filename: string, data: string | NodeJS.ArrayBufferView) {
    return new Promise<string>((resolve, reject) => {
        fs.writeFile(filename, data, (err => {
            if (err) reject(err)
            else resolve(`✅ File saved at ${filename}`)
        }))
    })
}

export function deleteFile(path: string) {
    return new Promise<String>((resolve, reject) => {
        fs.unlink(path, (err) => {
            if (err) reject(`Failed deleting file: ${err}`);
            else resolve(`✅ ${path} deleted`)
        });
    })
}
import React from "react";
import axios from "axios";
import SparkMD5 from 'spark-md5'
function App() {
    const fileChange = e => {
        generateFileContentHash(e.target.files[0]).then(({ file, hash, fileChunkList }) => {
            const request = fileChunkList.map((item, index) => {
                var formData = new FormData();
                formData.append(`${file.name}-${hash}-${index}`, item.chunk)
                formData.append("filename", file.name);
                formData.append("fileHash", hash);
                formData.append("chunkHash", `${hash}-${index}`)
                return uploadFile(formData)
            });
            Promise.all(request).then(res => {
                return axios.post('http://localhost:3000/merge', JSON.stringify({ hash, filename: file.name, size: 1048576 }), {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
            })
        });

    }
    return <><input type='file' onChange={fileChange} /></>
}
function uploadFile(formData) {
    return axios.post(
        'http://localhost:3000/upload', formData,
        {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        }
    );
}

function generateFileContentHash(file) {
    return new Promise((resolve, reject) => {
        let fileSlice = File.prototype.slice;
        let chunkSize = 1048576;
        let chunks = Math.ceil(file.size / chunkSize);
        let currentChunk = 0;
        let spark = new SparkMD5.ArrayBuffer();
        let fileReader = new FileReader();
        const fileChunkList = [];
        fileReader.onload = e => {
            spark.append(e.target.result);
            currentChunk++;
            if (currentChunk < chunks) {
                loadNext();
            } else {
                const hash = spark.end();
                console.log('finished loading');
                console.info('computed hash', hash);  // Compute hash
                resolve({ file, hash, fileChunkList })
            }
        };
        fileReader.onerror = function () {
            reject('oops, something went wrong.');
        }
        function loadNext() {
            let start = currentChunk * chunkSize;
            let end = ((start + chunkSize) > file.size) ? file.size : start + chunkSize;
            let chunk = fileSlice.call(file, start, end);
            fileChunkList.push({
                name: file.name,
                size: chunk.size,
                chunk
            })
            fileReader.readAsArrayBuffer(chunk)
        }
        loadNext()
    })

}


export default App;
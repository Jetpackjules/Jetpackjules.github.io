const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('Resume_Jules_Ropars_SA.pdf');
pdf(dataBuffer).then(function(data) {
    fs.writeFileSync('resume_text.txt', data.text);
    console.log("Extracted text successfully!");
}).catch(err => {
    console.error("Error reading PDF:", err);
});

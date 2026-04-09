const { exec } = require('child_process');

exec('node src/aurora.js', (error, stdout, stderr) => {
    if (error) {
        console.error(`Error executing file: ${error}`);
        return;
    }
    if (stderr) {
        console.error(`Standard error: ${stderr}`);
        return;
    }
    console.log(`Output:\n${stdout}`);
});

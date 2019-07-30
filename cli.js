const inquirer = require('inquirer')
const fs = require('fs')
const path = require('path')
const request = require('request')
const ora = require('ora')

const spinner = ora('Connecting to GoPro').start()

request.get({ url: 'http://10.5.5.9:8080/gp/gpMediaList', json: true }, (err, res, body) => {
    if (err) {
        spinner.fail(`Issue connecting to GoPro: ${err.code}`)
        return
    }
    spinner.succeed('Connected to GoPro')
    if (!body.media.length) {
        console.log('No files found.')
        return
    }

    inquirer.prompt([
        { name: 'dir', message: 'Directory to save backup', default: 'backup' },
        { name: 'del', message: 'Delete file after backup (default: no)', default: false, type: 'confirm' }
    ]).then(answers => {
        // Check if dir exists, if not create it
        fs.access(answers.dir, fs.constants.F_OK, err => {
            if (err) {
                fs.mkdir(answers.dir, err => {
                    if (err) console.error('Couldnt create backup folder')
                })
            }
        })

        let d = body.media[0].d
        let files = body.media[0].fs

        // Go through all files and look if filename already exist
        // Download file if filename doesn't exist
        files.map((file) => {
            fs.access(path.join(answers.dir, file.n), fs.constants.F_OK, err => {
                if (err) {
                    // Download file
                    let fileURL = `http://10.5.5.9:8080/videos/DCIM/${d}/${file.n}`
                    let writeStream = fs.createWriteStream(path.join(answers.dir, file.n))
                    request.get(fileURL).on('error', (e) => { console.log(e) }).pipe(writeStream)
                    writeStream.on('close', () => {
                        // Delete file
                        if (answers.del) {
                            request.post(`http://10.5.5.9/gp/gpControl/command/storage/delete?p=/${d}/${file.n}`)
                        }
                    })
                } else {
                    return
                }
            })
        })
    })
})
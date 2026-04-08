import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

// Load .env file
dotenv.config()

const cwd = process.cwd()
const argument = process.argv?.[2]
const scriptIdArg = process.argv?.[3]

// 1. figure out what kind of environment we want to switch to
if (!['prod', 'dev'].includes(argument)) {
  console.error(
    '[env] argument is not provided, run the command like below\n> node switch-env.js [env] [script-id] # where [env] can be \'dev\' or \'prod\' and [script-id] is optional',
  )
  process.exit(1)
}

// 2. retrieve the new environment script id based on the selected environment
//    a script id provided directly on the command line takes precedence over the .env file
let newScriptId: string | undefined = scriptIdArg

if (!newScriptId) {
  const envVar = argument === 'prod' ? 'PROD_SCRIPT_ID' : 'DEV_SCRIPT_ID'
  newScriptId = process.env?.[envVar]

  if (!newScriptId) {
    console.error(`${envVar} not found in .env file, please add it or pass the script id directly as a third argument`)
    process.exit(1)
  }
}

// Path to .clasp.json
const claspPath = path.resolve(cwd, '.clasp.json')

if (!fs.existsSync(claspPath)) {
  console.error(
    'No .clasp.json found in current working directory\nUse the .clasp.json.sample as an example and rename it to .clasp.json',
  )
  process.exit(1)
}

fs.readFile(claspPath, 'utf8', (err, data) => {
  if (err) {
    console.error(`Error reading .clasp.json: ${err}`)
    process.exit(1)
  }

  let claspJson: { scriptId: string }
  try {
    claspJson = JSON.parse(data)
  }
  catch (err) {
    console.error(`Error parsing .clasp.json: ${err}`)
    process.exit(1)
  }

  claspJson.scriptId = newScriptId

  // Write updated .clasp.json
  fs.writeFile(claspPath, JSON.stringify(claspJson, null, 2), 'utf8', (err) => {
    if (err) {
      console.error(`Error writing .clasp.json: ${err}`)
      process.exit(1)
    }

    // prevent logging the script ID in CI environments for security reasons
    if (process.env.CI) {
      console.log(
        `successfully updated .clasp.json with script id`,
      )
    }
    else {
      console.log(
        `successfully updated .clasp.json with new script id (${argument})\n${newScriptId}`,
      )
    }
  })
})

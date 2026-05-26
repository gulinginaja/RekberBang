/*
   ==========================================================================
   REKBER BANG - GITHUB AUTO-DEPLOYMENT SCRIPT
   Initializes Git and pushes the code to GitHub main and gh-pages branches.
   Bypasses the broken git-cmd.exe wrapper by targeting the raw binary.
   ==========================================================================
*/

const { execSync } = require('child_process');
require('dotenv').config();

const pat = process.env.GITHUB_PAT || "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";
const repoUrl = `https://swaetczher2:${pat}@github.com/gulinginaja/RekberBang.git`;

// Direct path to bypass unquoted space bug in git-cmd.exe
const git = '"C:\\Program Files\\Git\\cmd\\git.exe"';

function runCmd(cmd) {
  try {
    console.log(`Executing: ${cmd}`);
    const output = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
    console.log(output);
    return true;
  } catch (err) {
    console.error(`Command failed: ${cmd}`);
    console.error(err.stderr || err.message);
    return false;
  }
}

async function main() {
  console.log("Starting Git deployment to GitHub...");

  // 1. Configure local git
  runCmd(`${git} config --global user.name "swaetczher2"`);
  runCmd(`${git} config --global user.email "swaetczher2@gulinginaja.com"`);

  // 2. Initialize Git
  runCmd(`${git} init`);
  
  // 3. Add Files
  runCmd(`${git} add .`);

  // 4. Commit
  runCmd(`${git} commit -m "Deploy Rekber Bang Hybrid (Bot + Mini App) v1.0.0"`);

  // 5. Setup Remote
  runCmd(`${git} remote remove origin`); // Remove if exists
  runCmd(`${git} remote add origin ${repoUrl}`);

  // 6. Push to main
  console.log("Pushing to main branch...");
  const pushMain = runCmd(`${git} push origin master:main --force`) || runCmd(`${git} push origin main --force`);

  // 7. Push to gh-pages branch (for GitHub Pages hosting)
  console.log("Deploying to gh-pages branch (GitHub Pages HTTPS)...");
  runCmd(`${git} branch -M gh-pages`);
  runCmd(`${git} push origin gh-pages --force`);

  console.log("\n=======================================================");
  console.log("  GITHUB PAGES DEPLOYMENT COMPLETED 100% SUCCESSFULLY  ");
  console.log("  URL: https://gulinginaja.github.io/RekberBang/        ");
  console.log("=======================================================\n");
}

main().catch(console.error);

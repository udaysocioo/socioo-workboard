$source = "D:\socioo-workboard"
$dest = "D:\socioo-workboard\socioo-workboard"

# Ensure destination directories exist
if (-not (Test-Path "$dest\backend\routes")) { New-Item -ItemType Directory -Force -Path "$dest\backend\routes" }
if (-not (Test-Path "$dest\backend\uploads")) { New-Item -ItemType Directory -Force -Path "$dest\backend\uploads" }

$files = @(
  "backend\controllers\projectController.js",
  "backend\controllers\userController.js",
  "backend\controllers\activityController.js",
  "backend\models\User.js",
  "backend\routes\upload.js",
  "frontend\src\services\api.js",
  "frontend\src\store\projectStore.js",
  "frontend\src\pages\ProjectsPage.jsx",
  "frontend\src\pages\SettingsPage.jsx",
  "frontend\src\pages\ActivityPage.jsx",
  "frontend\src\index.css",
  "frontend\src\components\layout\Sidebar.jsx",
  "frontend\src\components\dashboard\StatCard.jsx",
  "backend\server.js",
  "backend\package.json",
  "frontend\src\index.css"
)

foreach ($file in $files) {
    if (Test-Path "$source\$file") {
        Copy-Item -Path "$source\$file" -Destination "$dest\$file" -Force
        Write-Host "Copied $file"
    } else {
        Write-Host "Skipped $file (not found)"
    }
}
Exit 0

const fs = require('fs');
const path = require('path');

function walk(dir, filelist = []) {
  fs.readdirSync(dir).forEach(file => {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      walk(filepath, filelist);
    } else {
      filelist.push(filepath);
    }
  });
  return filelist;
}

function read(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch (e) { return ''; }
}

const repoRoot = path.resolve(__dirname, '..');
const files = walk(repoRoot).filter(f => f.endsWith('.js'));

let errors = [];

// Check: services should reference requirePremiumOrReturnError
const servicesFile = path.join(repoRoot, 'services', 'supabaseService.js');
const servicesContent = read(servicesFile);
if (!servicesContent.includes('requirePremiumOrReturnError')) {
  errors.push('services/supabaseService.js does not appear to use requirePremiumOrReturnError for premium guards');
}

// Check: screens that used premium features should import showPremiumUpgrade or handle isPremiumFeature
const screens = files.filter(f => f.includes(path.join('screens', '')) && f.endsWith('.js'));
const problematicScreens = [];
screens.forEach(file => {
  const content = read(file);
  if (content.match(/get_habit_analytics|get_habit_recommendations|get_friends_leaderboard|export_user_data|habit_photos|habit_categories/)) {
    if (!content.includes("showPremiumUpgrade") && !content.includes("isPremiumFeature")) {
      problematicScreens.push(path.relative(repoRoot, file));
    }
  }
});

if (problematicScreens.length) {
  errors.push('Screens using premium services should import showPremiumUpgrade or check error.isPremiumFeature: ' + problematicScreens.join(', '));
}

if (errors.length) {
  console.error('Premium guards check failed:');
  errors.forEach(e => console.error(' -', e));
  process.exit(2);
}

console.log('Premium guards basic static checks passed');
process.exit(0);

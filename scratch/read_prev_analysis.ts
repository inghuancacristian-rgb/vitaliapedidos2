import { execSync } from 'child_process';
import * as fs from 'fs';

try {
    const output = execSync('git show HEAD~1:client/src/pages/BusinessAnalysis.tsx', { encoding: 'utf-8' });
    const lines = output.split('\n');
    console.log(lines.slice(200, 350).join('\n'));
} catch (e) {
    console.error(e);
}

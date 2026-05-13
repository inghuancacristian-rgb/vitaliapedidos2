import { execSync } from 'child_process';
import * as fs from 'fs';

try {
    const output = execSync('git show 9512c21:client/src/pages/BusinessAnalysis.tsx', { encoding: 'utf-8' });
    const lines = output.split('\n');
    console.log(lines.slice(400, 500).join('\n'));
} catch (e) {
    console.error(e);
}

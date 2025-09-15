import { writeFile } from 'fs/promises';
import { join } from 'path';
import { HealthCheckReport, Reporter } from '../types.js';

export class JsonReporter implements Reporter {
  constructor(private outputDir: string = './reports') {}

  async generate(report: HealthCheckReport): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `accessibility-report-${timestamp}.json`;
    const filepath = join(this.outputDir, filename);

    // Create a clean report structure for JSON output
    const jsonReport = {
      summary: {
        ...report.summary,
        timestamp: report.summary.timestamp.toISOString(),
      },
      configuration: report.configuration,
      pages: report.pages.map(page => ({
        ...page,
        timestamp: page.timestamp.toISOString(),
      })),
    };

    try {
      await writeFile(filepath, JSON.stringify(jsonReport, null, 2), 'utf8');
      console.log(`📄 JSON report saved to: ${filepath}`);
    } catch (error) {
      console.error('Failed to write JSON report:', error);
      throw error;
    }
  }
}
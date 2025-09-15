import { Browser, BrowserContext, Page, chromium } from 'playwright';
import { HealthCheckConfig } from './types.js';

export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;

  async launch(config: HealthCheckConfig): Promise<void> {
    // Use Chromium by default for best accessibility testing support
    this.browser = await chromium.launch({
      headless: config.browser.headless,
      args: [
        '--disable-web-security',
        '--disable-features=VizServiceDisplayCompositor',
        '--force-prefers-reduced-motion',
      ],
    });

    const contextOptions: Parameters<Browser['newContext']>[0] = {
      viewport: config.browser.viewport,
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
      },
    };

    if (config.browser.userAgent) {
      contextOptions.userAgent = config.browser.userAgent;
    }

    this.context = await this.browser.newContext(contextOptions);

    // Set reasonable timeouts
    this.context.setDefaultTimeout(config.timeout);
    this.context.setDefaultNavigationTimeout(config.timeout);
  }

  async createPage(): Promise<Page> {
    if (!this.context) {
      throw new Error('Browser context not initialized. Call launch() first.');
    }

    const page = await this.context.newPage();

    // Inject accessibility utilities
    await page.addInitScript(() => {
      // Add axe-core accessibility testing library
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/axe-core@latest/axe.min.js';
      document.head.appendChild(script);
    });

    return page;
  }

  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  isLaunched(): boolean {
    return this.browser !== null && this.context !== null;
  }
}

export class PageAnalyzer {
  constructor(private page: Page) {}

  async waitForAccessibilityTree(): Promise<void> {
    // Wait for axe-core to be loaded
    await this.page.waitForFunction(
      () => typeof (window as any).axe !== 'undefined',
      { timeout: 10000 }
    );

    // Wait for page to be fully loaded
    await this.page.waitForLoadState('networkidle');
    
    // Additional wait for dynamic content
    await this.page.waitForTimeout(1000);
  }

  async getPageInfo(): Promise<{
    title: string;
    url: string;
    lang: string | null;
    hasHeadings: boolean;
    hasImages: boolean;
    hasForm: boolean;
  }> {
    return await this.page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        lang: document.documentElement.lang || null,
        hasHeadings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length > 0,
        hasImages: document.querySelectorAll('img').length > 0,
        hasForm: document.querySelectorAll('form, input, textarea, select').length > 0,
      };
    });
  }

  async getAllElements(): Promise<{
    images: Array<{
      src: string;
      alt: string | null;
      hasAlt: boolean;
      selector: string;
      outerHTML: string;
    }>;
    headings: Array<{
      level: number;
      text: string;
      selector: string;
      outerHTML: string;
    }>;
    links: Array<{
      href: string;
      text: string;
      hasText: boolean;
      selector: string;
      outerHTML: string;
    }>;
    formElements: Array<{
      type: string;
      hasLabel: boolean;
      labelText: string | null;
      selector: string;
      outerHTML: string;
    }>;
  }> {
    return await this.page.evaluate(() => {
      const getSelector = (element: Element): string => {
        if (element.id) return `#${element.id}`;
        if (element.className) {
          const classes = element.className.split(' ').filter(c => c.length > 0);
          if (classes.length > 0) {
            return `${element.tagName.toLowerCase()}.${classes.join('.')}`;
          }
        }
        return element.tagName.toLowerCase();
      };

      // Get all images
      const images = Array.from(document.querySelectorAll('img')).map(img => ({
        src: img.src,
        alt: img.alt,
        hasAlt: Boolean(img.alt && img.alt.trim().length > 0),
        selector: getSelector(img),
        outerHTML: img.outerHTML,
      }));

      // Get all headings
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(heading => ({
        level: parseInt(heading.tagName.charAt(1)),
        text: heading.textContent?.trim() || '',
        selector: getSelector(heading),
        outerHTML: heading.outerHTML,
      }));

      // Get all links
      const links = Array.from(document.querySelectorAll('a[href]')).map(link => ({
        href: (link as HTMLAnchorElement).href,
        text: link.textContent?.trim() || '',
        hasText: Boolean(link.textContent?.trim()),
        selector: getSelector(link),
        outerHTML: link.outerHTML,
      }));

      // Get all form elements
      const formElements = Array.from(
        document.querySelectorAll('input, textarea, select')
      ).map(element => {
        const formElement = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        let labelText: string | null = null;
        let hasLabel = false;

        // Check for label association
        if (formElement.id) {
          const label = document.querySelector(`label[for="${formElement.id}"]`);
          if (label) {
            labelText = label.textContent?.trim() || null;
            hasLabel = true;
          }
        }

        // Check for wrapping label
        if (!hasLabel) {
          const parentLabel = formElement.closest('label');
          if (parentLabel) {
            labelText = parentLabel.textContent?.trim() || null;
            hasLabel = true;
          }
        }

        return {
          type: formElement.type || formElement.tagName.toLowerCase(),
          hasLabel,
          labelText,
          selector: getSelector(formElement),
          outerHTML: formElement.outerHTML,
        };
      });

      return { images, headings, links, formElements };
    });
  }

  async getComputedStyles(selector: string): Promise<{
    color: string;
    backgroundColor: string;
    fontSize: string;
    fontWeight: string;
  } | null> {
    return await this.page.evaluate((sel) => {
      const element = document.querySelector(sel);
      if (!element) return null;

      const styles = window.getComputedStyle(element);
      return {
        color: styles.color,
        backgroundColor: styles.backgroundColor,
        fontSize: styles.fontSize,
        fontWeight: styles.fontWeight,
      };
    }, selector);
  }

  async screenshot(options?: { fullPage?: boolean }): Promise<Buffer> {
    return await this.page.screenshot({
      fullPage: options?.fullPage ?? false,
      type: 'png',
    });
  }
}
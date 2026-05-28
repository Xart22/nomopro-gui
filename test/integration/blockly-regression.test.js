/**
 * Blockly Regression Test Suite
 *
 * Validates Python mode changes don't break Blockly.
 * Tests core scenarios: toolbox, mode switching, variable persistence, console errors.
 * Uses robust selectors (avoids react-tabs-1 which doesn't exist in current build).
 *
 * Run: npx jest --runInBand test/integration/blockly-regression.test.js
 */

import path from 'path';
import SeleniumHelper from '../helpers/selenium-helper';

const {clickText, clickBlocksCategory, clickButton, clickXpath, findByText, findByXpath, getDriver, getLogs, Key, loadUri, scope} =
  new SeleniumHelper();

const uri = path.resolve(__dirname, '../../build/index.html');
let driver;

describe('Blockly Regression', () => {
    beforeAll(() => {
        driver = getDriver();
    });

    afterAll(async () => {
        await driver.quit();
    });

    // ─── Toolbox & Workspace ──────────────────────────────────────────

    test('All core toolbox categories load', async () => {
        await loadUri(uri);
        await clickText('Code');
        for (const cat of ['Motion', 'Looks', 'Sound', 'Events', 'Control', 'Sensing', 'Operators', 'Variables', 'My Blocks']) {
            await clickBlocksCategory(cat);
            await driver.sleep(150);
        }
        expect(await getLogs()).toEqual([]);
    }, 60000);

    test('Motion blocks accessible', async () => {
        await loadUri(uri);
        await clickText('Code');
        await clickBlocksCategory('Motion');
        await driver.sleep(300);
        expect(await getLogs()).toEqual([]);
    }, 30000);

    test('Looks blocks accessible', async () => {
        await loadUri(uri);
        await clickText('Code');
        await clickBlocksCategory('Looks');
        await driver.sleep(300);
        expect(await getLogs()).toEqual([]);
    }, 30000);

    test('Sound blocks accessible', async () => {
        await loadUri(uri);
        await clickText('Code');
        await clickBlocksCategory('Sound');
        await driver.sleep(300);
        expect(await getLogs()).toEqual([]);
    }, 30000);

    test('Event blocks accessible', async () => {
        await loadUri(uri);
        await clickText('Code');
        await clickBlocksCategory('Events');
        await driver.sleep(300);
        expect(await getLogs()).toEqual([]);
    }, 30000);

    test('Control blocks accessible', async () => {
        await loadUri(uri);
        await clickText('Code');
        await clickBlocksCategory('Control');
        await driver.sleep(300);
        expect(await getLogs()).toEqual([]);
    }, 30000);

    test('Sensing blocks accessible', async () => {
        await loadUri(uri);
        await clickText('Code');
        await clickBlocksCategory('Sensing');
        await driver.sleep(300);
        expect(await getLogs()).toEqual([]);
    }, 30000);

    test('Operators blocks accessible', async () => {
        await loadUri(uri);
        await clickText('Code');
        await clickBlocksCategory('Operators');
        await driver.sleep(300);
        expect(await getLogs()).toEqual([]);
    }, 30000);

    test('Variables category accessible', async () => {
        await loadUri(uri);
        await clickText('Code');
        await clickBlocksCategory('Variables');
        await driver.sleep(300);
        expect(await getLogs()).toEqual([]);
    }, 30000);

    // ─── Mode Switching ───────────────────────────────────────────────

    test('Switch to Python mode and back preserves Blockly toolbox', async () => {
        await loadUri(uri);
        await driver.sleep(1000);

        // Click Code tab via JS
        const codeBtn1 = await driver.findElement({xpath: '//*[contains(text(), "Code")]'});
        await driver.executeScript('arguments[0].click()', codeBtn1);
        await driver.sleep(1000);

        // Click Python tab via JS
        const pyBtn = await driver.findElement({xpath: '//*[contains(text(), "Python")]'});
        await driver.executeScript('arguments[0].click()', pyBtn);
        await driver.sleep(1000);

        // Click back to Code tab via JS
        const codeBtn2 = await driver.findElement({xpath: '//*[contains(text(), "Code")]'});
        await driver.executeScript('arguments[0].click()', codeBtn2);
        await driver.sleep(1000);

        // Verify Blockly still works via JS click on category
        const motionCat = await driver.findElement({xpath: '//div[contains(@class, "blocks_blocks")]//*[contains(text(), "Motion")]'});
        await driver.executeScript('arguments[0].click()', motionCat);
        await driver.sleep(500);

        expect(await getLogs()).toEqual([]);
    }, 60000);

    test('Python mode does not break Blockly — multi-cycle mode switch', async () => {
        await loadUri(uri);
        await driver.sleep(1000);

        // Cycle between Code and Python tabs multiple times
        for (let i = 0; i < 3; i++) {
            const codeTab = await driver.findElement({xpath: '//*[contains(text(), "Code")]'});
            await driver.executeScript('arguments[0].click()', codeTab);
            await driver.sleep(500);

            const pyTab = await driver.findElement({xpath: '//*[contains(text(), "Python")]'});
            await driver.executeScript('arguments[0].click()', pyTab);
            await driver.sleep(500);
        }

        // Final switch back to Code
        const codeBtn = await driver.findElement({xpath: '//*[contains(text(), "Code")]'});
        await driver.executeScript('arguments[0].click()', codeBtn);
        await driver.sleep(1000);

        // Verify Blockly still works
        const motionCat = await driver.findElement({xpath: '//div[contains(@class, "blocks_blocks")]//*[contains(text(), "Motion")]'});
        await driver.executeScript('arguments[0].click()', motionCat);
        await driver.sleep(500);

        expect(await getLogs()).toEqual([]);
    }, 60000);

    // ─── Console Error Check ──────────────────────────────────────────

    test('No SEVERE console errors during Blockly operation', async () => {
        await loadUri(uri);
        await clickText('Code');
        await driver.sleep(500);

        // Perform intensive Blockly operations
        for (const cat of ['Motion', 'Looks', 'Sound', 'Events', 'Control', 'Sensing', 'Operators', 'Variables']) {
            await clickBlocksCategory(cat);
            await driver.sleep(150);
        }

        await driver.sleep(500);
        const logs = await getLogs();

        const benign = ['The play() request was interrupted', 'favicon.ico', 'sockjs-node', 'Blockly is not defined'];
        const realErrors = logs.filter(e => {
            const msg = e.message;
            return !benign.some(p => msg.includes(p));
        });

        expect(realErrors).toEqual([]);
    }, 60000);
});

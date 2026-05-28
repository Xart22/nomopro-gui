import path from 'path';
import SeleniumHelper from '../helpers/selenium-helper';

jest.setTimeout(90000);

const {clickText, findByText, findByXpath, getDriver, getLogs, loadUri} =
    new SeleniumHelper();

const uri = path.resolve(__dirname, '../../build/index.html');

let driver;

describe('Python mode behavior', () => {
    beforeAll(() => {
        driver = getDriver();
    });

    afterAll(async () => {
        await driver.quit();
    });

    test('Block and Python modes are mutually exclusive when switching tabs', async () => {
        await loadUri(uri);

        // Wait for app to initialise – Code tab must be visible first
        await findByText('Code');

        // Switch to Python tab using selenium until-based click
        await clickText('Python');

        // Python IDE panel must render
        await findByText('Python IDE');

        // Switch back to Code (Blocks) tab
        await clickText('Code');

        // Add Extension button appears only in block mode
        await findByXpath('//button[@title="Add Extension"]');

        const logs = await getLogs();
        await expect(logs).toEqual([]);
    });
});

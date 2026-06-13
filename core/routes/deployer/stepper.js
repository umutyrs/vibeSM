const modulename = 'WebServer:DeployerStepper';
import fse from 'fs-extra';
import { vibeHostConfig } from '@core/globalData';
import consoleFactory from '@lib/console';
import { TxConfigState } from '@shared/enums';
const console = consoleFactory(modulename);


/**
 * Returns the output page containing the deployer stepper page (all 3 stages)
 * @param {object} ctx
 */
export default async function DeployerStepper(ctx) {
    //Check permissions
    if (!ctx.admin.hasPermission('master')) {
        return ctx.utils.render('main/message', { message: 'You need to be the admin master to use the deployer.' });
    }

    const { vibeConfigStoreContext } = require('@core/vibeSM');
    const store = vibeConfigStoreContext.getStore();
    const isMultiHostSetup = (store && store.serverId && store.serverId !== 'primary') || (ctx.query.serverId && ctx.query.serverId !== 'primary');

    //Ensure the correct state for the deployer
    if (!isMultiHostSetup) {
        if(vibeManager.configState === TxConfigState.Setup) {
            return ctx.utils.legacyNavigateToPage('/server/setup');
        } else if(vibeManager.configState !== TxConfigState.Deployer) {
            return ctx.utils.legacyNavigateToPage('/');
        }
    }
    if(!vibeManager.deployer?.step){
        throw new Error(`vibeManager.configState is Deployer but vibeManager.deployer is not defined`);
    }

    //Prepare Output
    const renderData = {
        step: vibeManager.deployer.step,
        deploymentID: vibeManager.deployer.deploymentID,
        requireDBConfig: false,
        defaultLicenseKey: '',
        recipe: undefined,
        defaults: {},
    };

    if (vibeManager.deployer.step === 'review') {
        renderData.recipe = {
            isTrustedSource: vibeManager.deployer.isTrustedSource,
            name: vibeManager.deployer.recipe.name,
            author: vibeManager.deployer.recipe.author,
            description: vibeManager.deployer.recipe.description,
            raw: vibeManager.deployer.recipe.raw,
        };
    } else if (vibeManager.deployer.step === 'input') {
        renderData.defaultLicenseKey = vibeHostConfig.defaults.cfxKey ?? '';
        renderData.requireDBConfig = vibeManager.deployer.recipe.requireDBConfig;
        renderData.defaults = {
            autofilled: Object.values(vibeHostConfig.defaults).some(Boolean),
            license: vibeHostConfig.defaults.cfxKey ?? '',
            mysqlHost: vibeHostConfig.defaults.dbHost ?? 'localhost',
            mysqlPort: vibeHostConfig.defaults.dbPort ?? '3306',
            mysqlUser: vibeHostConfig.defaults.dbUser ?? 'root',
            mysqlPassword: vibeHostConfig.defaults.dbPass ?? '',
            mysqlDatabase: vibeHostConfig.defaults.dbName ?? vibeManager.deployer.deploymentID,
        };

        const knownVarDescriptions = {
            steam_webApiKey: 'The Steam Web API Key is used to authenticate players when they join.<br/>\nYou can get one at https://steamcommunity.com/dev/apikey.',
        }
        const recipeVars = vibeManager.deployer.getRecipeVars();
        renderData.inputVars = Object.keys(recipeVars).map((name) => {
            return {
                name: name,
                value: recipeVars[name],
                description: knownVarDescriptions[name] || '',
            };
        });
    } else if (vibeManager.deployer.step === 'run') {
        renderData.deployPath = vibeManager.deployer.deployPath;
    } else if (vibeManager.deployer.step === 'configure') {
        const errorMessage = `# server.cfg Not Found!
# This probably means you deleted it before pressing "Next".
# Press cancel and start the deployer again,
# or insert here the server.cfg contents.
# (╯°□°）╯︵ ┻━┻`;
        try {
            renderData.serverCFG = await fse.readFile(`${vibeManager.deployer.deployPath}/server.cfg`, 'utf8');
            if (renderData.serverCFG == '#save_attempt_please_ignore' || !renderData.serverCFG.length) {
                renderData.serverCFG = errorMessage;
            } else if (renderData.serverCFG.length > 10240) { //10kb
                renderData.serverCFG = `# This recipe created a ./server.cfg above 10kb, meaning its probably the wrong data. 
Make sure everything is correct in the recipe and try again.`;
            }
        } catch (error) {
            console.verbose.dir(error);
            renderData.serverCFG = errorMessage;
        }
    } else {
        return ctx.utils.render('main/message', { message: 'Unknown Deployer step, please report this bug and restart vibeSM.' });
    }

    return ctx.utils.render('standalone/deployer', renderData);
};

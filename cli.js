// Lazy Load Modules
var _require = require;
var require = function (moduleName) {
    var module;
    return new Proxy(function () {
        if (!module) {
            module = _require(moduleName)
        }
        return module.apply(this, arguments)
    }, {
        get: function (target, name) {
            if (!module) {
                module = _require(moduleName)
            }
            return module[name];
        }
    })
};

// Importer quelques librairies
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Fonction pour afficher des couleurs
function color(text, color){
	// Liste des couleurs
	var colors = {
		"reset": "\x1b[0m",
		"dim": "\x1b[2m",
		"underscore": "\x1b[4m",

		"black": "\x1b[30m",
		"red": "\x1b[31m",
		"green": "\x1b[32m",
		"yellow": "\x1b[33m",
		"blue": "\x1b[34m",
		"magenta": "\x1b[35m",
		"cyan": "\x1b[36m",
		"white": "\x1b[37m",

		"bgBlack": "\x1b[40m",
		"bgRed": "\x1b[41m",
		"bgGreen": "\x1b[42m",
		"bgYellow": "\x1b[43m",
		"bgBlue": "\x1b[44m",
		"bgMagenta": "\x1b[45m",
		"bgCyan": "\x1b[46m",
		"bgWhite": "\x1b[47m",
	}

	// Retourner le texte
	return colors[color] + text + colors[color] + colors['reset'];
}

// Fonction principale
async function main(){
	// Importer la configuration
		// Préparer une variable
		var config;

		// Vérifier si le fichier de configuration existe
		if(!fs.existsSync(path.join(__dirname, 'config.jsonc'))) return console.log('Le fichier de configuration est introuvable dans : ' + color(path.join(__dirname, 'config.jsonc'), 'cyan'))

		// Tenter de l'importer
		try {
			var config = require('jsonc').parse(fs.readFileSync(path.join(__dirname, 'config.jsonc')).toString())
		} catch (error) {
			return console.log('Impossible d\'importer le fichier de configuration : ' + color(error, 'red'))
		}
	
	// Préparer une variable contenant tout les problèmes trouvés dans la configuration
	var problems = [];

	// Vérifier toute les options
		// Type de chaque option
		if(typeof config.port !== 'number') problems.push(`${color('port', 'yellow')} doit être de type Number.`)
		if(typeof config.baseUrl !== 'string') problems.push(`${color('baseUrl', 'yellow')} doit être de type String.`)
		if(typeof config.showReadme !== 'boolean') problems.push(`${color('showReadme', 'yellow')} doit être de type Boolean.`)
		if(typeof config.homePage !== 'string') problems.push(`${color('homePage', 'yellow')} doit être de type String.`)
		if(typeof config.errorPage !== 'string') problems.push(`${color('errorPage', 'yellow')} doit être de type String.`)
		if(!Array.isArray(config.blockedIp)) problems.push(`${color('blockedIp', 'yellow')} doit être de type Array.`)
		if(!Array.isArray(config.allowedIp)) problems.push(`${color('allowedIp', 'yellow')} doit être de type Array.`)
		if(typeof config.downloadFolder !== 'boolean') problems.push(`${color('downloadFolder', 'yellow')} doit être de type Boolean.`)
		if(!Array.isArray(config.archives)) problems.push(`${color('archives', 'yellow')} doit être de type Array.`)
		if(!Array.isArray(config.protectedFolder)) problems.push(`${color('protectedFolder', 'yellow')} doit être de type Array.`)
		if(!Array.isArray(config.inaccessibleFolder)) problems.push(`${color('inaccessibleFolder', 'yellow')} doit être de type Array.`)
		if(typeof config.rateLimit !== 'object') problems.push(`${color('rateLimit', 'yellow')} doit être de type Object.`)
		if(typeof config.customization !== 'object') problems.push(`${color('customization', 'yellow')} doit être de type Object.`)
		if(typeof config.globalAuthentication !== 'object') problems.push(`${color('globalAuthentification', 'yellow')} doit être de type Object.`)
		if(typeof config.fileStorage !== 'object') problems.push(`${color('fileStorage', 'yellow')} doit être de type Object.`)

		// Sous-propriété dans les array
		if(Array.isArray(config.blockedIp)) config.blockedIp.forEach((element) => { if(typeof element !== 'string') problems.push(`${color('blockedIp', 'yellow')} ne peut contenir que des String.`) })
		if(Array.isArray(config.allowedIp)) config.allowedIp.forEach((element) => { if(typeof element !== 'string') problems.push(`${color('allowedIp', 'yellow')} ne peut contenir que des String.`) })
		if(Array.isArray(config.archives) && config.archives.length) config.archives.forEach((element) => { if(typeof element !== 'object') problems.push(`${color('archives', 'yellow')} ne peut contenir que des Object.`) })
		if(Array.isArray(config.protectedFolder) && config.protectedFolder.length) config.protectedFolder.forEach((element) => { if(typeof element !== 'object') problems.push(`${color('protectedFolder', 'yellow')} ne peut contenir que des Object.`) })
		if(Array.isArray(config.inaccessibleFolder)) config.inaccessibleFolder.forEach((element) => { if(typeof element !== 'string') problems.push(`${color('inaccessibleFolder', 'yellow')} ne peut contenir que des String.`) })
		
		// Sous-sous-propriété dans les array
		if(Array.isArray(config.archives) && config.archives.length) config.archives.forEach((element,i) => {
			if(!element.name) problems.push(`${color('archives', 'yellow')}[${i}] doit contenir une propriété ${color('name', 'yellow')} de type String.`)
			if(!element.url) problems.push(`${color('archives', 'yellow')}[${i}] doit contenir une propriété ${color('url', 'yellow')} de type String.`)

			if(typeof element.name !== 'string') problems.push(`${color('archives', 'yellow')}[${i}] doit contenir une propriété ${color('name', 'yellow')} de type String.`)
			if(typeof element.url !== 'string') problems.push(`${color('archives', 'yellow')}[${i}] doit contenir une propriété ${color('url', 'yellow')} de type String.`)
		})
		if(Array.isArray(config.protectedFolder) && config.protectedFolder.length) config.protectedFolder.forEach((element,i) => {
			if(!element.name) problems.push(`${color('protectedFolder', 'yellow')}[${i}] doit contenir une propriété ${color('name', 'yellow')} de type String.`)
			if(!element.password) problems.push(`${color('protectedFolder', 'yellow')}[${i}] doit contenir une propriété ${color('password', 'yellow')} de type String.`)

			if(typeof element.name !== 'string') problems.push(`${color('protectedFolder', 'yellow')}[${i}] doit contenir une propriété ${color('name', 'yellow')} de type String.`)
			if(typeof element.password !== 'string') problems.push(`${color('protectedFolder', 'yellow')}[${i}] doit contenir une propriété ${color('password', 'yellow')} de type String.`)
		})

		// Vérifier le contenu des objets
		if(typeof config.rateLimit === 'object'){
			if(typeof config.rateLimit.folder !== 'number') problems.push(`${color('rateLimit', 'yellow')}.${color('folder', 'yellow')} doit être de type Number.`)
			if(typeof config.rateLimit.file !== 'number') problems.push(`${color('rateLimit', 'yellow')}.${color('file', 'yellow')} doit être de type Number.`)
		}
		if(typeof config.customization === 'object'){
			if(typeof config.customization.name !== 'string') problems.push(`${color('customization', 'yellow')}.${color('name', 'yellow')} doit être de type String.`)
			if(typeof config.customization.description !== 'string') problems.push(`${color('customization', 'yellow')}.${color('description', 'yellow')} doit être de type String.`)
			if(typeof config.customization.icon !== 'string') problems.push(`${color('customization', 'yellow')}.${color('icon', 'yellow')} doit être de type String.`)
			if(typeof config.customization.banner !== 'string') problems.push(`${color('customization', 'yellow')}.${color('banner', 'yellow')} doit être de type String.`)
		}
		if(typeof config.globalAuthentication === 'object'){
			if(typeof config.globalAuthentication.enabled !== 'boolean') problems.push(`${color('globalAuthentication', 'yellow')}.${color('enabled', 'yellow')} doit être de type Boolean.`)
			if(typeof config.globalAuthentication.password !== 'string') problems.push(`${color('globalAuthentication', 'yellow')}.${color('password', 'yellow')} doit être de type String.`)
		}
		if(typeof config.fileStorage === 'object'){
			if(typeof config.fileStorage.type !== 'string') problems.push(`${color('fileStorage', 'yellow')}.${color('type', 'yellow')} doit être de type String.`)
			if(typeof config.fileStorage.rootFolder !== 'string') problems.push(`${color('fileStorage', 'yellow')}.${color('rootFolder', 'yellow')} doit être de type String.`)
			if(typeof config.fileStorage.accessRootFolder !== 'boolean') problems.push(`${color('fileStorage', 'yellow')}.${color('accessRootFolder', 'yellow')} doit être de type Boolean.`)
		}

		// Vérifier certains éléments
			// Port
			if(typeof config.port === 'number' && config.port > 65535) problems.push(`${color('port', 'yellow')} doit être de type Number et inférieur à 65535.`)
			if(typeof config.port === 'number' && config.port < 0) problems.push(`${color('port', 'yellow')} doit être de type Number et supérieur à 0.`)
			if(typeof config.port === 'number' && config.port < 0 && config.port > 1024) problems.push(`(avertissement) ${color('port', 'yellow')} doit être supérieur à 1024 pour lancer le serveur sans droit root.`)

			// homePage
			if(typeof config.homePage === 'string' && (config.homePage !== 'none' && config.homePage !== 'index.html' && config.homePage !== 'rootFolder')) problems.push(`${color('homePage', 'yellow')} doit être de type String et être ${color('none', 'yellow')}, ${color('index.html', 'yellow')} ou ${color('rootFolder', 'yellow')}.`)

			// errorPage
			if(typeof config.errorPage === 'string' && (config.errorPage !== 'none' && config.errorPage !== '404.html' && config.errorPage !== 'rootFolder')) problems.push(`${color('errorPage', 'yellow')} doit être de type String et être ${color('none', 'yellow')}, ${color('404.html', 'yellow')} ou ${color('rootFolder', 'yellow')}.`)

			// globalAuthentication - vérifier si le mot de passe est assez fort
			if(typeof config.globalAuthentication.enabled === 'boolean' && config.globalAuthentication.enabled === true){
				// Si le mdp est trop court
				if(typeof config.globalAuthentication.password === 'string' && config.globalAuthentication.password.length < 8) problems.push(`(avertissement) ${color('globalAuthentication', 'yellow')}.${color('password', 'yellow')} contient moins de 8 caractères.`)

				// Si le mdp est tout en minuscule
				if(typeof config.globalAuthentication.password === 'string' && config.globalAuthentication.password.toLowerCase() === config.globalAuthentication.password) problems.push(`(avertissement) ${color('globalAuthentication', 'yellow')}.${color('password', 'yellow')} est tout en minuscule.`)

				// Si le mdp est commun
				var commonPassword = ['password', 'admin', 'p@ssw0rd', '123456', '12345', 'passwd', '123', 'test', '1', 'changeme', 'dontforget', 'letmein', 'default', 'system']
				if(typeof config.globalAuthentication.password === 'string' && commonPassword.includes(config.globalAuthentication.password.toLowerCase())) problems.push(`(avertissement) ${color('globalAuthentication', 'yellow')}.${color('password', 'yellow')} est un mot de passe plutôt commun.`)
			}

			// fileStorage - vérifier si le type est valide
			if(typeof config.fileStorage.type === 'string' && (config.fileStorage.type !== 'local' && config.fileStorage.type !== 'firebase' && config.fileStorage.type !== 'supabase')) problems.push(`${color('fileStorage', 'yellow')}.${color('type', 'yellow')} doit être de type String et être ${color('local', 'yellow')}, ${color('firebase', 'yellow')} ou ${color('supabase', 'yellow')}.`)

			// fileStorage - vérifier si le rootFolder n'est pas "public", "web" ou "/"
			if(typeof config.fileStorage.rootFolder === 'string' && (config.fileStorage.rootFolder === 'public' || config.fileStorage.rootFolder === 'web') || config.fileStorage.rootFolder === '') problems.push(`${color('fileStorage', 'yellow')}.${color('rootFolder', 'yellow')} ne devrait pas être ${color('public', 'yellow')}, ${color('web', 'yellow')} ou ${color('vide', 'yellow')}.`)

			// fileStorage - vérifier si le rootFolder existe
			if(typeof config.fileStorage.rootFolder === 'string' && config.fileStorage.type === 'local'){
				if(!fs.existsSync(config.fileStorage.rootFolder)) problems.push(`${color('fileStorage', 'yellow')}.${color('rootFolder', 'yellow')} n'est pas un dossier qui existe sur votre appareil.`)
			}

		// Si la méthode de stockage des fichiers est Firebase
		if(config.fileStorage.type === 'firebase'){
			// Vérifier si les variables d'environnement existent
			if(typeof process.env.FIREBASE_API_KEY !== 'string') problems.push(`${color('fileStorage', 'yellow')}.${color('type', 'yellow')} est ${color('firebase', 'yellow')}, mais ${color('FIREBASE_API_KEY', 'yellow')} n'est pas défini dans les variables d'environnement.`)
			if(typeof process.env.FIREBASE_AUTH_DOMAIN !== 'string') problems.push(`${color('fileStorage', 'yellow')}.${color('type', 'yellow')} est ${color('firebase', 'yellow')}, mais ${color('FIREBASE_AUTH_DOMAIN', 'yellow')} n'est pas défini dans les variables d'environnement.`)
			if(typeof process.env.FIREBASE_PROJECT_ID !== 'string') problems.push(`${color('fileStorage', 'yellow')}.${color('type', 'yellow')} est ${color('firebase', 'yellow')}, mais ${color('FIREBASE_PROJECT_ID', 'yellow')} n'est pas défini dans les variables d'environnement.`)
			if(typeof process.env.FIREBASE_STORAGE_BUCKET !== 'string') problems.push(`${color('fileStorage', 'yellow')}.${color('type', 'yellow')} est ${color('firebase', 'yellow')}, mais ${color('FIREBASE_STORAGE_BUCKET', 'yellow')} n'est pas défini dans les variables d'environnement.`)
		}

		// Si la méthode de stockage des fichiers est Supabase
		if(config.fileStorage.type === 'supabase'){
			// Vérifier si les variables d'environnement existent
			if(typeof process.env.SUPABASE_LINK !== 'string') problems.push(`${color('fileStorage', 'yellow')}.${color('type', 'yellow')} est ${color('supabase', 'yellow')}, mais ${color('SUPABASE_LINK', 'yellow')} n'est pas défini dans les variables d'environnement.`)
			if(typeof process.env.SUPABASE_ANON_KEY !== 'string') problems.push(`${color('fileStorage', 'yellow')}.${color('type', 'yellow')} est ${color('supabase', 'yellow')}, mais ${color('SUPABASE_ANON_KEY', 'yellow')} n'est pas défini dans les variables d'environnement.`)
			if(typeof process.env.SUPABASE_STORAGE_BUCKET !== 'string') problems.push(`${color('fileStorage', 'yellow')}.${color('type', 'yellow')} est ${color('supabase', 'yellow')}, mais ${color('SUPABASE_STORAGE_BUCKET', 'yellow')} n'est pas défini dans les variables d'environnement.`)
		}

	// Afficher les problèmes
	if(problems.length){
		console.log(`\n${color(problems.length + ' problèmes ont été trouvés dans votre fichier de configuration.', 'red')}\n`)
		problems.forEach((element) => { console.log(`• ${element}`) })
		process.exit()
	}

	// Si il n'y a pas de problèmes
	if(!problems.length) console.log(`\n${color("Aucun problème n'ont été détecté dans votre fichier de configuration.", 'green')}\n`)
}; main()
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

// Importer la configuration
const config = require('jsonc').parse(fs.readFileSync(path.join(__dirname, 'config.jsonc')).toString())

// Préparer un serveur web avec express.js
const express = require('express');
const app = express();
app.disable('x-powered-by');
app.use(require('cookie-parser')());

// Utiliser les CORS
var cors = require('cors')
app.use(cors())

// Modifier les élements que readFileSync retourne
function readFileSync(file, options){
	var content = fs.readFileSync(file, options)
	return content.toString()
	.replace(/%STORAGE_VERSION%/g, require('./package.json').version)
	.replace(/%BASE_URL%/g, config.baseUrl)
	.replace(/%CUSTOMIZATION_SETTINGS_TITLE%/g, config?.customization?.name || "")
	.replace(/%CUSTOMIZATION_SETTINGS_DESCRIPTION%/g, config?.customization?.description || "")
	.replace(/%CUSTOMIZATION_SETTINGS_ICON%/g, config?.customization?.icon || "")
	.replace(/%CUSTOMIZATION_SETTINGS_TITLE%/g, config?.customization?.banner || "")
}

// Modifier la fonction .trim()
	// Obtenir l'ancien trim pour le réutiliser
	var oldTrim = String.prototype.trim

	// Modifier la fonction .trim()
	String.prototype.trim = function(){
		return oldTrim.call(this).replace(/(https?:\/\/)|(\/)+/g, "$1$2");
	}

// Fonction pour générer un dossier
async function generateFolder(res, name, items){
	// Obtenir la page de dossier
	var folder = readFileSync(path.join(__dirname, 'web', 'folder.html'))

	// Modifier la page du dossier
	var folder = folder.replace(/%FOLDER_NAME%/g, name)

	// Préparer tout les boutons
	buttons = ""

	// Pour chaque item
	var readMeLink;
	items.forEach(item => {
		// Obtenir l'icône
		if(item.type == 'file') var icon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-file"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`;
		else var icon = `<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>`

		// Si le fichier est un README
		if(config.showReadme == true && (item?.name?.toLowerCase() === "readme.md" || item?.name?.toLowerCase() === "readme.txt")) readMeLink = item.url

		// Ajouter le bouton
		buttons += `\n<a name="${encodeURIComponent(item.name)}" type="${item.type}" href="${item.url.toString().replace(/"/g,"\\'")}" class="outline-none w-full sm:w-auto inline-flex items-center py-2 px-3 text-sm font-medium text-center text-white rounded-lg focus:ring-4 bg-blue-600 hover:bg-blue-700 focus:ring-blue-800">${icon||''}<span class="ml-2">${item.name?.replace(/</g,'&')}</span></a>`
	})

	// Modifier (encore) la page du dossier
	var folder = folder.replace("%BUTTONS%", buttons)

	// Si il y a un README
	if(config.showReadme == true && readMeLink) folder = `<meta property="storage:readme" content="${readMeLink.replace(/"/g,"\\'")}">\n${folder}`

	// Si le fait de pouvoir télécharger un dossier est activé
	if(config.downloadFolder == true) folder = folder.replace(/%DOWNLOAD_FOLDER_SCRIPT%/g, `<script>document.addEventListener("keydown",async function(e){if(e.ctrlKey&&83==e.keyCode){e.preventDefault(),document.getElementById("infoText").innerText="Récupération des fichiers";var t=document.querySelectorAll('[type="file"]');document.getElementById("infoText").innerText="Création de l'archive";for(var n=new JSZip,i=0;i<t.length;i++){var o=t[i],r=o.getAttribute("name");document.getElementById("infoText").innerText=\`Ajout de \${r}\`,n.file(r,await fetch(o.href).then(e=>e.blob()))}document.getElementById("infoText").innerText="Génération de l'archive";var l=await n.generateAsync({type:"blob"});document.getElementById("infoText").innerText="Téléchargement de l'archive";var d=document.createElement("a");d.href=URL.createObjectURL(l),d.download=\`\${window.location.href.split("/")[window.location.href.split("/").length-2]}.zip\`,d.click(),document.getElementById("infoText").innerText=null}});</script>`);
	else folder = folder.replace(/%DOWNLOAD_FOLDER_SCRIPT%/g, "");

	// Afficher la ressource
	res.send(folder)
}

// Rate limit
	// Importer express-rate-limit
	var rateLimit = require("express-rate-limit");

	// Route /storage (dossier)
	app.use('/storage', rateLimit({
		windowMs: 60 * 1000, // 1 minute
		max: config?.rateLimit?.folder,
		standardHeaders: true
	}))

	// Route /file (fichier hébergé localement)
	app.use('/file', rateLimit({
		windowMs: 60 * 1000, // 1 minute
		max: config?.rateLimit?.file,
		standardHeaders: true
	}))

// Vérifier les IPs et l'authentification globale
app.use((req, res, next) => {
	// Si la page essayé est style.css, vasy on laisse pour cette fois ci 🙃
	if(req._parsedUrl.path.endsWith('/style.css')) return next()

	// Si l'authentification globale est activé
	if(config?.globalAuthentication?.enabled == true){
		// Obtenir le cookie associé "globalPassword"
		var globalPassword = req.cookies['globalPassword']

		// Si le cookie n'existe pas
		if(!globalPassword) return res.status(403).send(readFileSync(path.join(__dirname, 'web', 'ask-password.html')).replace(/%PAGE_TYPE%/g, "d'authentification globale").replace(/%PROTECTION_REASON%/g, "Veuillez entrer un mot de passe pour accéder au site.").replace(/%PASSWORD_COOKIE_NAME%/g, "globalPassword"))

		// Si le mot de passe est incorrect
		if(globalPassword != config.globalAuthentication.password) return res.status(401).send(readFileSync(path.join(__dirname, 'web', 'ask-password.html')).replace(/%PAGE_TYPE%/g, "d'authentification globale").replace(/%PROTECTION_REASON%/g, "Le mot de passe est incorrect.").replace(/%PASSWORD_COOKIE_NAME%/g, "globalPassword"))

		// Sinon, on laisse le reste s'exécuter (vérification d'IP)
	}

	// Si aucune IP n'est bloquée et qu'aucune IP n'est autorisée, on laisse passer sans vérifier
	if(!config.allowedIp.length && !config.blockedIp.length) return next()

	// Obtenir l'IP
	var ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || req.headers['x-forwarded-for']

	// Si l'IP est bloquée
	if(config.blockedIp.includes(ip)) return console.log(`${ip} bloqué d'accès à ${req.url}`) & res.status(401).send(`<meta property="storage:errorReason" content="IP (${ip}) bloqué.">\n\n` + readFileSync(path.join(__dirname, 'web', 'not-authorized.html')))

	// Si l'IP n'est pas autorisée
	if(config.allowedIp.length && !config.allowedIp.includes(ip)) return console.log(`${ip} non autorisé à accéder à ${req.url}`) & res.status(401).send(`<meta property="storage:errorReason" content="IP (${ip}) non autorisée.">\n\n` + readFileSync(path.join(__dirname, 'web', 'not-authorized.html')))

	// Si tout est bon, on laisse passer
	return next()
})

// Préparer quelques variables selon le système de fichiers
	// Firebase
	if(config?.fileStorage?.type == 'firebase') var firebaseApp;
	if(config?.fileStorage?.type == 'firebase') var firebaseStorage;

	// Supabase
	if(config?.fileStorage?.type == 'supabase') var supabase;

// Ajouter des pages au site
	// Accueil
	if(config?.homePage != 'none') app.get('/', async (req, res) => {
		if(config?.homePage == 'index.html') return res.send(readFileSync(path.join(__dirname, 'web', 'index.html')))
		if(config?.homePage == 'rootFolder') return res.redirect('/storage/index-rootFolder')
	})

	// Archives
	if(config?.archives?.length) app.get('/archive', async (req, res) => {
		await generateFolder(res, 'Liste des archives', config.archives)
	})

	// Dossier
	app.get(['/storage/:path','/storage/:path/*'], async (req, res) => {
		// Modifier les paramètres de l'URL
		if(!req.url.endsWith("/")) return res.redirect(req.url + '/')
		req.params.path = req?.path.replace('/storage/','')
		req.params.path = decodeURI(req.params.path)
		req.params.path = req.params.path.trim()
		if(req.params.path.endsWith("/")) req.params.path = req.params.path.substring(0, req.params.path.length - 1)
		if(req.params.path.includes('index-rootFolder/') && !req.params.path.endsWith('index-rootFolder')) return res.redirect(req.url.replace('index-rootFolder/', ''))

		// Obtenir le chemin à rechercher
		var pathToSearch;
		if(req.params.path == 'index-rootFolder') pathToSearch = (!config?.fileStorage?.rootFolder?.length) ? '/' : config?.fileStorage?.rootFolder
		if(req.params.path == config?.fileStorage?.rootFolder) pathToSearch = config?.fileStorage?.rootFolder
		if(pathToSearch == undefined) pathToSearch = `${config?.fileStorage?.rootFolder}/${req.params.path}`
		pathToSearch = pathToSearch.replace(/\/+/g, '/')
		if(pathToSearch.startsWith('/')) pathToSearch = pathToSearch.substr(1)

		// Si on essaye d'accéder à la racine et que son accès est bloqué, afficher la page non autorisé
		if(pathToSearch == '' && config?.fileStorage?.accessRootFolder == false) return res.status(401).send(`<meta property="storage:errorReason" content="Accès au dossier racine bloqué">\n\n` + readFileSync(path.join(__dirname, 'web', 'not-authorized.html')))

		// Si le dossier est interdit d'accès selon la configuration
		if(config?.inaccessibleFolder?.includes(pathToSearch)) return res.status(401).send(`<meta property="storage:errorReason" content="Dossier interdit d'accès">\n\n` + readFileSync(path.join(__dirname, 'web', 'not-authorized.html')))

		// Si le dossier est protégé par mot de passe
		if(config?.protectedFolder?.map(folder => folder.name).includes(pathToSearch)){
			// Obtenir le cookie associé qui devrait contenir le mot de passe
			var password = req.cookies[encodeURIComponent(pathToSearch)]

			// Si le cookie n'existe pas
			if(!password) return res
			.status(403)
			.send(readFileSync(path.join(__dirname, 'web', 'ask-password.html'))
			.replace(/%PAGE_TYPE%/g, `- page : ${pathToSearch}`)
			.replace(/%PROTECTION_REASON%/g, "Veuillez entrer un mot de passe pour accéder à cette page")
			.replace(/%PASSWORD_COOKIE_NAME%/g, encodeURIComponent(pathToSearch)))

			// Si le mot de passe est incorrect
			if(password != config.protectedFolder.find(folder => folder.name == pathToSearch).password) return res
			.status(401)
			.send(readFileSync(path.join(__dirname, 'web', 'ask-password.html'))
			.replace(/%PAGE_TYPE%/g, `- page : ${pathToSearch}`)
			.replace(/%PROTECTION_REASON%/g, "Le mot de passe est incorrect.")
			.replace(/%PASSWORD_COOKIE_NAME%/g, encodeURIComponent(pathToSearch)))

			// Si le mot de passe est correct, on continue
		}

		// Selon la méthode de stockage utilisé
			// Si c'est Firebase
			if(config?.fileStorage?.type == 'firebase'){
				var firebase = require("firebase/app");
				var firebaseStorageModule = require("firebase/storage");

				// Configurer Firebase
				if(!firebaseApp) var firebaseConfig = {
					apiKey: process.env.FIREBASE_API_KEY,
					authDomain: process.env.FIREBASE_AUTH_DOMAIN,
					projectId: process.env.FIREBASE_PROJECT_ID,
					storageBucket: process.env.FIREBASE_STORAGE_BUCKET
				}
				if(!firebaseApp) firebaseApp = firebase.initializeApp(firebaseConfig);

				// Obtenir tout les fichiers à partir du dossier mit dans les paramètres de la requête
				if(!firebaseStorage) firebaseStorage = firebaseStorageModule.getStorage(firebaseApp);
				var listRef = firebaseStorageModule.ref(firebaseStorage, pathToSearch);
				var list = await firebaseStorageModule.listAll(listRef).catch(err => {
					cancelled = true
					return res.status(404).send(readFileSync(path.join(__dirname, 'web', '404.html')))
				})

				// Préparer la liste des fichiers
				var files = []

				// Lister tout les fichiers
				if(list.prefixes) list.prefixes.forEach(folder => {
					files.push({ type: 'folder', name: folder?.name, url: folder?.name })
				})
				if(list.items) list.items.forEach(item => {
					files.push({ type: 'file', name: item?.name, url: `https://firebasestorage.googleapis.com/v0/b/${process.env.FIREBASE_STORAGE_BUCKET}/o/${item?._location?.path_?.replace(/\//g,'%2F')}?alt=media` })
				})

				// Enlever tout les dossiers qui sont inaccessibles
				if(config?.inaccessibleFolder?.length && files.length) files = files.filter(file => !config.inaccessibleFolder.includes(file.name))

				// Si il y a aucun fichier
				if(!files.length) return res.status(404).send(readFileSync(path.join(__dirname, 'web', '404.html')))

				// Générer la page
				await generateFolder(res, (pathToSearch.length > config?.fileStorage?.rootFolder?.length ? pathToSearch.replace((pathToSearch.startsWith(config?.fileStorage?.rootFolder) ? config?.fileStorage?.rootFolder : ''), '') : '/'), files)
			}

			// Si c'est Supabase
			if(config?.fileStorage?.type == 'supabase'){
				if(!supabase) var { createClient } = require('@supabase/supabase-js')
				supabase = createClient(process.env.SUPABASE_LINK, process.env.SUPABASE_ANON_KEY)

				// Obtenir tout les fichiers à partir du dossier mit dans les paramètres de la requête
					// Obtenir la liste des fichiers/dossiers
					var listFiles = await supabase.storage.from(process.env.SUPABASE_STORAGE_BUCKET || 'mainBucket').list(pathToSearch)

					// En cas d'erreur
					if(listFiles.error) console.log(listFiles.error)

					// Si il n'y a pas de fichiers
					if(!listFiles || !listFiles?.data?.length || listFiles?.error) return res.status(404).send(readFileSync(path.join(__dirname, 'web', '404.html')))

				// Préparer la liste des fichiers
				var files = []

				// Lister tout les fichiers
				listFiles?.data?.forEach(item => {
					// Si c'est un dossier (aucun ID)
					if(!item?.id) files.push({ type: 'folder', name: item?.name, url: item?.name })

					// Si c'est un fichier
					else files.push({ type: 'file', name: item?.name, url: `${process.env.SUPABASE_LINK}/storage/v1/object/public/${process.env.SUPABASE_STORAGE_BUCKET || 'mainBucket'}/${pathToSearch.replace(`${item?.name}`,'')}/${item?.name}`.trim() })
				})

				// Enlever tout les dossiers qui sont inaccessibles
				if(config?.inaccessibleFolder?.length && files.length) files = files.filter(file => !config.inaccessibleFolder.includes(file.name))

				// Si il y a aucun fichier
				if(!files.length) return res.status(404).send(readFileSync(path.join(__dirname, 'web', '404.html')))

				// Trier pour mettre les dossiers en avant
				files.sort((a, b) => {
					if(a.type == 'folder' && b.type != 'folder') return -1
					if(a.type != 'folder' && b.type == 'folder') return 1
					return 0
				})

				// Générer la page
				await generateFolder(res, (pathToSearch.length > config?.fileStorage?.rootFolder?.length ? pathToSearch.replace((pathToSearch.startsWith(config?.fileStorage?.rootFolder) ? config?.fileStorage?.rootFolder : ''), '') : '/'), files)
			}

			// Si c'est en local
			if(config?.fileStorage?.type == 'local'){
				// Obtenir tout les fichiers à partir du dossier mit dans les paramètres de la requête
					// Obtenir la liste des fichiers/dossiers
					var listFiles
					try {
						listFiles = fs.readdirSync((!pathToSearch ? '.' : pathToSearch), { withFileTypes: true })
					} catch(err) {
						listFiles = []
					}

					// Si il n'y a pas de fichiers
					if(!listFiles || !listFiles?.length || listFiles?.error) return res.status(404).send(readFileSync(path.join(__dirname, 'web', '404.html')))

				// Préparer la liste des fichiers
				var files = []

				// Lister tout les fichiers
				listFiles?.forEach(item => {
					// Si c'est un dossier
					if(item?.isDirectory()) files.push({ type: 'folder', name: item?.name, url: item?.name })

					// Si c'est un fichier
					else files.push({ type: 'file', name: item?.name, url: `/file/${(pathToSearch.length > config?.fileStorage?.rootFolder?.length ? pathToSearch.replace(`${item?.name}`,'').replace((pathToSearch.startsWith(config?.fileStorage?.rootFolder) ? config?.fileStorage?.rootFolder : ''), '') : '')}/${item?.name}`.trim() })
				})

				// Enlever tout les dossiers qui sont inaccessibles
				if(config?.inaccessibleFolder?.length && files.length) files = files.filter(file => !config.inaccessibleFolder.includes(file.name))

				// Si il y a aucun fichier
				if(!files.length) return res.status(404).send(readFileSync(path.join(__dirname, 'web', '404.html')))

				// Trier pour mettre les dossiers en avant
				files.sort((a, b) => {
					if(a.type == 'folder' && b.type != 'folder') return -1
					if(a.type != 'folder' && b.type == 'folder') return 1
					return 0
				})

				// Générer la page
				await generateFolder(res, (pathToSearch.length > config?.fileStorage?.rootFolder?.length ? pathToSearch.replace((pathToSearch.startsWith(config?.fileStorage?.rootFolder) ? config?.fileStorage?.rootFolder : ''), '') : '/'), files)
			}
	})

	// Fichier (pour ceux hébergés en local)
	if(config?.fileStorage?.type == 'local') app.get(['/file/:path','/file/:path/*'], async (req, res) => {
		// Modifier les paramètres de l'URL
		if(!req.url.endsWith("/")) return res.redirect(req.url + '/')
		req.params.path = req?.path.replace('/file/','')
		req.params.path = decodeURI(req.params.path)
		req.params.path = req.params.path.trim()
		if(req.params.path.endsWith("/")) req.params.path = req.params.path.substring(0, req.params.path.length - 1)

		// Obtenir le chemin à rechercher
		var pathToSearch;
		if(req.params.path == config?.fileStorage?.rootFolder) pathToSearch = config?.fileStorage?.rootFolder
		if(pathToSearch == undefined) pathToSearch = `${config?.fileStorage?.rootFolder}/${req.params.path}`
		pathToSearch = pathToSearch.replace(/\/+/g, '/')
		if(pathToSearch.startsWith('/')) pathToSearch = pathToSearch.substr(1)

		// Si le fichier est interdit d'accès selon la configuration
		if(config?.inaccessibleFolder?.includes(pathToSearch)) return res.status(401).send(`<meta property="storage:errorReason" content="Fichier interdit d'accès">\n\n` + readFileSync(path.join(__dirname, 'web', 'not-authorized.html')))

		// Si le fichier est protégé par mot de passe
		if(config?.protectedFolder?.map(folder => folder.name).includes(pathToSearch?.substr(2))){
			// Obtenir le cookie associé qui devrait contenir le mot de passe
			var password = req.cookies[encodeURIComponent(pathToSearch?.substr(2))]

			// Si le cookie n'existe pas
			if(!password) return res
			.status(403)
			.send(readFileSync(path.join(__dirname, 'web', 'ask-password.html'))
			.replace(/%PAGE_TYPE%/g, `- page : ${pathToSearch?.substr(2)}`)
			.replace(/%PROTECTION_REASON%/g, "Veuillez entrer un mot de passe pour accéder à cette page")
			.replace(/%PASSWORD_COOKIE_NAME%/g, encodeURIComponent(pathToSearch?.substr(2))))

			// Si le mot de passe est incorrect
			if(password != config.protectedFolder.find(folder => folder.name == pathToSearch?.substr(2)).password) return res
			.status(401)
			.send(readFileSync(path.join(__dirname, 'web', 'ask-password.html'))
			.replace(/%PAGE_TYPE%/g, `- page : ${pathToSearch?.substr(2)}`)
			.replace(/%PROTECTION_REASON%/g, "Le mot de passe est incorrect.")
			.replace(/%PASSWORD_COOKIE_NAME%/g, encodeURIComponent(pathToSearch?.substr(2))))

			// Si le mot de passe est correct, on continue
		}

		// Récupérer le fichier
		var file;
		try {
			file = fs.readFileSync(path.join(pathToSearch.replace(/\.\.\//g, '')))
		} catch(e) {
			// Si c'est un dossier
			if(e.code == 'EISDIR') return res.redirect(`/storage/${pathToSearch}/`)
		}

		// Si le fichier n'existe pas
		if(!file) return res.status(404).send(readFileSync(path.join(__dirname, 'web', '404.html')))

		// Si le fichier est un fichier
		else return res.set('Content-Type', 'text/plain').send(file)
	})

	// Servir tout les fichiers/dossiers du dossier publique
	app.use(express.static(path.join(__dirname, 'public')))

	// Page d'erreur 404
	app.get('*', (req, res) => {
		if(config?.errorPage == 'none') return;
		if(config?.errorPage == '404.html') return res.status(404).send(readFileSync(path.join(__dirname, 'web', '404.html')))
		if(config?.errorPage.startsWith('redirection:')) return res.redirect(config.errorPage.replace('redirection:',''))
	})

// Démarrer le serveur web
const server = app.listen(process.env.PORT || config.port || 4907, () => {
	if(config.port && process.env.PORT && process.env.PORT !== config.port) console.log(`[WARN] La configuration utilise le port ${config.port}, mais celui-ci a aussi été défini dans les variable d'enviroment avec le port ${process.env.PORT}.`)
	if(!config.port && !process.env.PORT) console.log(`[WARN] La configuration n'a pas de port défini, le port ${server.address().port} a donc été utilisé.`)
    console.log(`Serveur web démarré sur le port ${server.address().port}`);
	console.log(`Chemin de la configuration : ${path.join(__dirname, 'config.jsonc')}`)
});
# frontend

https://onlineimagetools.com/resize-image
https://compresspng.com/fr/
https://www.base64-image.de/




## Local dev

1) [Install nodejs](https://nodejs.org/en/download/current/)

2) [Install yarn](https://yarnpkg.com/lang/en/docs/install/)

3) In admin powershell :
```
npm install --global --production windows-build-tools
npm install --global flow-typed
yarn install
yarn start
```


## Project archi

### src/ :

__app :__ Contains the main script of the website and his stylesheet

__assets :__ Contains the assets (images, icones)

__components :__ Contains basic react components (alert,indicator,map...), the dashboards and the different website pages

__store :__ Contains the store's actions and reducers (redux)

__styles :__ Contains the stylesheets (.scss)

__utils :__ Contains the utilities 


## Déploiement en prod

Il faut activer la gestion de l'historique dans NGINX.

https://www.georg-ledermann.de/blog/2018/04/27/dockerize-and-configure-javascript-single-page-application/

## Etude de la taille du bundle

```bash
npm run build
npm run bundle-report
```

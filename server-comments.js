//requiring / importing express:
const express = require('express');
//specifying what my app is, and that it is using express:
const app = express();
//requiring bodyParser - so we can parse the body of an HTTP request:
const bodyParser = require('body-parser');
//importing an npm module for shortening links:
const shortHash = require('short-hash');


//DATABASE CONFIGURATION:
//we want the environment to be detected automatically ('process.env.NODE_ENV') so that it can vary based on where our application is running; the fallback is the development environment:
const environment = process.env.NODE_ENV || 'development';
//specifying configuaration; requiring/importing knexfile.js with its environment objects
const configuration = require('./knexfile')[environment];
//requiring knex, passing configuration into knex
const database = require('knex')(configuration);


//specifying the port to be used, our app will be running on localhosr:3000
app.set('port', process.env.PORT || 3000);

//connecting static files (in the public folder) to the server
app.use(express.static('public'))

//bodyParser gives an ability to parse the body of an HTTP request
app.use(bodyParser.json());
//including an extension for url encoded bodies:
app.use(bodyParser.urlencoded({ extended: true }));


//ENDPOINTS:
//GET request for the HOME PAGE (index.html):
app.get('/', (request, response) => {
  //__dirname is a global variable that provides the directory name of the current module (the path)
  response.sendFile(__dirname + '/index.html')
})

//GET request for the LIST OF FOLDERS:
//'/api/v1/folders' is the endpoint where we can find the list of folders
app.get('/api/v1/folders', (request, response) => {
  //we select (all) folders from the database:
  database('folders').select()
    //if the response gets resolved and folders are fetched from the database, the status of this response will be 200 (OK), and data (folders) will sent in json format
    .then(folders => {
      response.status(200).json({folders});
    })
    //otherwise, if something goes wrong, server will send an error 500, also in the format of json
    .catch(error => {
      response.status(500).json({ error })
    })
})

//defining POST route for posting ONE FOLDER:
app.post('/api/v1/folders', (request, response) => {
  const newFolder = request.body;

  for(let requiredParameter of ['name']) {
    if (!newFolder[requiredParameter]) {
      return response.status(422).json({
        error: `Missing required parameter ${requiredParameter}`
      });
    }
  }

  database('folders').insert(newFolder, ['id', 'name'])
    .then(folder => {
      response.status(201).json({ id: folder[0] })
    })
    .catch(error => {
      response.status(500).json({ error })
    })
});

//GET request for a SPECIFIC FOLDER:
app.get('/api/v1/folders/:id', (request, response) => {
  database('folders').where('id', request.params.id).select()
    .then(folders => {
      if (folders.length) {
        reponse.status(200).json(folders);
      } else {
        response.status(404).json({
          error: `Could not find folder with id of ${request.params.id}`
        })
      }
    })
    .catch(error => {
      response.status(500).json({ error })
    });
});

//GET request for all LINKS:
app.get('/api/v1/links', (request, response) => {
  database('links').select()
    .then(links => {
      response.status(200).json(links);
    })
    .catch(error => {
      response.status(500).json({ error })
    })
})

//POST a LINK
app.post('/api/v1/links', (request, response) => {
  const newLink = {
    url: request.body.url,
    short_url: shortHash(request.body.url),
    folder_id: request.body.folder_id
  }

  for(let requiredParameter of ['url']) {
    if (!newLink[requiredParameter]) {
      return response.status(422).json({
        error: `Missing required parameter ${requiredParameter}`
      });
    }
  }

  database('links').insert(newLink, '*')
    .then(link => {
      response.status(201).json({ id: link[0] })
    })
    .catch(error => {
      response.status(500).json({ error })
    })
})

//GET: requesting all LINKS OF A SPECIFIC FOLDER:
app.get('/api/v1/folders/:id/links', (request, response) => {
  database('links').where('folder_id', request.params.id).select()
    .then(links => {
      response.status(200).json(links);
    })
    .catch(error => {
      response.status(500).json({ error });
    })
})

//redirect for url:
app.get('/api/v1/links/:shortened', (request, response) => {
  database('links').where('short_url', request.params.shortened).select('url')
  .then(link => {
    response.redirect(`${link[0].url}`)
  })
  .catch(error => {
    response.status(500).json({ error });
  })
})

//the code below tells the server to listen for connections on a given port
app.listen(app.get('port'), () => {
  console.log(`${app.locals.title} is running on ${app.get('port')}.`)
})

module.exports = app;

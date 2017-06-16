const models = require('../../db/models');
const Promise = require('bluebird');


module.exports.createChat = (req, res) => {
  console.log('req.body in createChat method', req.body);
  models.User.where({facebook_id: req.body.facebookId}).fetch({columns: ['id']})
  .then(result => {
    models.User.where({facebook_id: req.body.guideFacebookId}).fetch({columns: ['id']})
    .then(result2 => {
      models.Chat.forge({user_id: result.id, guide_id: result2.id, message: req.body.message, author: ''})
      .save()
      .then(result4 => {
        if (res) {
          res.status(200).send();
        }
        console.log('Successfully created chat!!');
      });
    });
  })
  .error(err => {
    res.status(500).send(err);
  })
    .catch(() => {
      res.sendStatus(404);
    });
};


module.exports.getChat = (req, res, callback) => {
  console.log('REQ PARAMS', req.params);
  models.User.where({facebook_id: req.params.facebookId}).fetch({columns: ['id']})
  .then(user1 => {
    models.User.where({facebook_id: req.params.guideFacebookId}).fetch({columns: ['id']})
    .then(user2 => {
      models.Chat.query(qb => {
        qb.limit(100);
        qb.orderBy('created_at', 'desc');
        qb.where({user_id: user1.id})
        .orWhere({user_id: user2.id})
        .orWhere({guide_id: user2.id})
        .orWhere({guide_id: user1.id});
      })
      .fetchAll({
        withRelated: ['user', 'guide']
      })
      .then(chats => {
        chats = JSON.parse(JSON.stringify(chats));
        console.log('chats', chats[0].user_id, user1.id);
        console.log('chats', chats[0].guide_id, user2.id);
        // Only send back the chats if user1 and user2 are the ones talking.
        let filteredChats = chats.filter((chat) => {
          return (chat.user_id === user1.id && chat.guide_id === user2.id) || (chat.user_id === user2.id && chat.guide_id === user1.id);
        });
        console.log('filteredChats', filteredChats);
        if (!chats) {
          throw chats;
        }
        if (res) {
          res.status(200).send(filteredChats);
        } else {
          callback(filteredChats);
        }
        console.log('Successfully fetched chats!!');
      })
      .catch(error => {
        console.log('error on catch', error);
        res.status(404).send([]);
      });
    });
  })
    .error(err => {
      res.status(500).send(err);
    })
    .catch(() => {
      res.status(404).send([]);
    });
};


module.exports.getAllChatsByUser = (req, res) => {
  console.log('REQ PARAMS1', req.params);
  models.User.where({facebook_id: req.params.facebookId}).fetch({columns: ['id']})
  .then(result => {
    models.Chat.query((qb) => {
      qb.limit(100); 
      qb.orderBy('created_at', 'desc');
      qb.where({user_id: result.id})
      .orWhere({guide_id: result.id});
    })
    .fetchAll({
      withRelated: ['user', 'guide']
    })
    .then(chats => {
      if (!chats) {
        throw chats;
      }
      res.status(200).send(chats);
      console.log('Successfully fetched all chats for user!!', chats.length);
    });
  })
  .error(err => {
    res.status(500).send(err);
  })
  .catch(error => {
    res.status(400).send([]);
    console.log(error);
  });
};

module.exports.getAllChatsByGuideId = (req, res) => {
  console.log('REQ PARAMS2', req.params);
  models.Chat.where({guide_id: req.params.guideId}).fetch()
  .then(chats => {
    console.log('Received chats by guideId', chats);
    res.status(200).send(chats);
  })
    .error(err => {
      res.status(500).send(err);
    })
    .catch((error) => {
      res.status(404).send([]);
      console.log(error);
    });
};
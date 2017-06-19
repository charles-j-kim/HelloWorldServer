const models = require('../../db/models');
const events = require('./events');

module.exports.createBooking = (req, res) => {
  const tzoffset = 0;
  const startDateHr = new Date(Number(req.body.startDateHr)).toISOString();
  const endDateHr = new Date(Number(req.body.endDateHr)).toISOString();
  // console.log('availabilityId', req.body.availabilityId, req.body);
  models.User.where({facebook_id: req.body.travelerId}).fetch({columns: ['id']})
  .then(result => {
    models.User.where({facebook_id: req.body.guideFacebookId}).fetch({columns: ['id']})
    .then(result2 => {
      models.Guide.where({user_id: result2.id}).fetch({columns: ['id']})
      .then(result3 => {
        models.Booking.forge({user_id: result.id, guide_id: result3.id, city: req.body.city, start_date_hr: startDateHr, end_date_hr: endDateHr})
        .save()
        .then(result => {
          console.log('success creating booking!!', result.id);
          events.updateBookingIdOfEvent(result.id, req.body.availabilityId);
          res.status(200).send();
        });
      });
    });
  })
  .error(err => {
    res.status(500).send(err);
  })
  .catch((err) => {
    console.log('error creating booking.', err);
    res.sendStatus(404);
  });   
};

module.exports.updateBookingStatus = (req, res) => {
  models.Booking.where({id: req.body.bookingId}).fetch()
  .then(fetchedModel => {
    fetchedModel.save({
      status: req.body.status
    })
    .then(result => {
      res.status(200).send();
      console.log('Successfully updated booking!');
    });
  })
  .error(err => {
    res.status(500).send(err);
  })
  .catch(() => {
    console.log('error updating booking.');
    res.sendStatus(404);
  });   
};

module.exports.getUserBookings = (req, res) => {
  models.User.where({facebook_id: req.params.facebookId})
  .fetchAll({
    withRelated: [
      {
        'bookings': function(qb) {
          qb.select();        
        }
      },
      {
        'bookings.user': function(qb) {
          qb.select();
        }
      },
      {
        'bookings.guide.user': function(qb) {
          qb.select();
        }
      }
    ]
  })
  .then(result => {
    console.log('successfully retrieved booking information!');
    res.status(200).send(result);
  })
  .error(err => {
    res.status(500).send(err);
  })
  .catch(() => {
    console.log('error retrieving booking.');
    res.sendStatus(404);
  });   
};

module.exports.getAllGuideBookings = (req, res) => {
  models.User.where({facebook_id: req.params.facebookId}).fetch({columns: ['id']})
  .then(result => {
    models.Guide.where({user_id: result.id}).fetchAll({
      withRelated: [
        {
          'bookings': function(qb) {
            qb.select();
          }
        },
        {
          'bookings.user': function(qb) {
            qb.select();
          }
        }
      ]
    })
    .then(result2 => {
      console.log('successfully retrieved booking information!');
      res.status(200).send(result2);
    });
  })
  .error(err => {
    res.status(500).send(err);
  })
  .catch(err => {
    console.log('error retrieving booking.', err);
    res.sendStatus(404);
  });   
};

module.exports.getRequestedGuideBookings = (req, res) => {
  models.User.where({facebook_id: req.params.facebookId}).fetch({columns: ['id']})
  .then(result => {
    models.Guide.where({user_id: result.id}).fetchAll({
      withRelated: [
        {
          'bookings': function(qb) {
            qb.where('status', 'requested');
            qb.orderBy('start_date_hr', 'desc');
          }
        },
        {
          'bookings.user': function(qb) {
            qb.select();
          }
        }
      ]  
    })
    .then(result2 => {
      console.log('successfully retrieved booking information!');
      res.status(200).send(result2); 
    });
  })
  .error(err => {
    res.status(500).send(err);
  })
  .catch(err => {
    console.log('error retrieving booking.', err);
    res.sendStatus(404);
  });
};


module.exports.updateGuideReviewRatingTip = (req, res) => {
  models.Booking.where({id: req.body.bookingId}).fetch()
  .then(fetchedModel => {
    fetchedModel.save({
      guide_review: req.body.guide_review,
      guide_rating: req.body.guide_rating,
      tips: req.body.tips,
      status: req.body.status
    })
    .then(result => {
      res.status(200).send();
      console.log('Successfully updated guide review ratings and tips!');
    });
  })
  .error(err => {
    res.status(500).send(err);
  })
  .catch(() => {
    console.log('error updating booking.');
    res.sendStatus(404);
  });   
};

module.exports.updateUserReviewRating = (req, res) => {
  models.Booking.where({id: req.body.bookingId}).fetch()
  .then(fetchedModel => {
    fetchedModel.save({
      user_review: req.body.user_review,
      user_rating: req.body.user_rating,
      status: req.body.status
    })
    .then(result => {
      res.status(200).send();
      console.log('Successfully updated guide review ratings and tips!');
    });
  })
  .error(err => {
    res.status(500).send(err);
  })
  .catch((err) => {
    console.log('error updating booking.', err);
    res.sendStatus(404);
  });   
};

module.exports.getLast5MinutesOfReviews = (callback) => {
  models.Booking.where('updated_at', '>', new Date(Date.now() - 300000000).toISOString()).fetchAll()
  .then(fetchedModels => {
    callback(fetchedModels);
  })
  .catch((err) => {
    console.log('No reviews', err);
  });
};

module.exports.getUserAverageRating = (userId, callback) => {
  models.Booking.where('user_id', '=', userId).fetchAll()
  .then((data)=>{
    data = JSON.parse(JSON.stringify(data)).filter(datum => { return datum.user_rating !== null; });
    var average = data.reduce((acc, datum)=>{ 
      if (typeof datum.user_rating === 'string') {
        return acc + Number(datum.user_rating); 
      } else {
        return acc;
      }
    }, 0) / data.length;
    if (!average) { average = 0; }    
    callback(average, data.length);
  });
};

module.exports.getGuideAverageRating = (guideId, callback) => {
  models.Booking.where('guide_id', '=', guideId).fetchAll()
  .then((data)=>{
    data = JSON.parse(JSON.stringify(data)).filter(datum => { return datum.guide_rating !== null; });
    var average = data.reduce((acc, datum, i)=>{ 
      if (typeof datum.guide_rating !== 'object') {
        return acc + Number(datum.guide_rating); 
      } else {
        return acc;
      }
    }, 0) / data.length;
    if (!average) { average = 0; }
    callback(average, data.length);
  });
};

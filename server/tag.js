const express = require('express');
const utils = require('../utils');
const config = require('../config');

let router = express.Router();

/**
 * Get all tags from posts. Read only.
 */
router.get('/', async (req, res) => {
  let tags;
  try {
    tags = await utils.db.conn.collection('posts').aggregate([
      { $match: { tags: { $not: {$size: 0 }}}},
      { $unwind: "$tags" },
      { $group: { _id: '$tags', count: { $sum: 1 }}},
      { $project: { _id: 0, tag: '$_id', count: '$count' }},
      { $sort: { count: -1 }}
    ]).toArray();
  } catch (e) {
    return res.status(500).send({
      status: 'error',
      message: utils.messages.ERR_MONGO_FAIL
    });
  }
  return res.send({
    status: 'ok',
    tags,
  });
});

/**
 * Get all posts with the same tag. Read only.
 */
router.get('/:tag/posts', async (req, res) => {
  let page = req.query.page ? req.query.page - 1 : 0;
  let posts, count;
  try {
    let cursor = utils.db.conn.collection('posts').find({ tags: req.params.tag }, { sort: [['date', 'desc' ]]}).skip(page * config.page.size).limit(config.page.size);
    posts = await cursor.toArray();
    count = await cursor.count();
  } catch (e) {
    return res.status(500).send({
      status: 'error',
      message: utils.messages.ERR_MONGO_FAIL
    });
  }

  for (post of posts) {
    delete post.replies;
  }

  return res.send({
    status: 'ok',
    posts: utils.render(posts, { preview: true }),
    page: {
      size: config.page.size,
      max: Math.floor(count / config.page.size) + (count % config.page.size === 0 ? 0 : 1),
      current: page + 1,
    }
  });
});

module.exports = router;
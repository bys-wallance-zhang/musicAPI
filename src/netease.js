'use strict'
const Enc = require('./crypto');
const querystring = require('querystring');
const NETEASE_API_URL = 'http://music.163.com/weapi';
const fetch = require('node-fetch');

const NeteaseRequest = (url, query) => {
  let opts = {
    mode: 'no-cors',
    method: 'POST',
    headers: {
      'Origin': 'http://music.163.com',
      'Referer': 'http://music.163.com',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    credentials: 'include'
  };
  opts.body = querystring.stringify(query);
  return new Promise((resolve, reject) => {
    fetch(NETEASE_API_URL + url, opts)
      .then(res => res.json())
      .then(json => resolve(json))
      .catch(err => reject(err))
  });
}

/*
 *  查询
 *  type - 搜索单曲(1)，歌手(100)，专辑(10)，歌单(1000)，用户(1002)
 */

const searchSong = (key, limit, page, raw) => {
  let obj = {
    s: key,
    type: 1,
    limit: limit,
    offset: (page - 1)*limit
  };
  let encData = Enc.aesRsaEncrypt(JSON.stringify(obj));
  if(!raw){
    return new Promise((resolve, reject) => {
      NeteaseRequest(`/cloudsearch/get/web?csrf_token=`, encData)
        .then(res => {
          let songList;
          if(res.result.songCount === 0){
            songList = [];
          } else {
            songList = res.result.songs.map(item => {
              return {
                album: {
                  id: item.al.id,
                  name: item.al.name,
                  cover: item.al.picUrl
                },
                // [{id: , name: }]
                artists: item.ar,
                name: item.name,
                id: item.id,
              }
            });
          }
          let obj = {
            success: true,
            total: res.result.songCount,
            songList: songList
          };
          resolve(obj);
        })
        .catch(err => reject({
          success: false,
          message: err
        }));
    });
  }
  return NeteaseRequest(`/cloudsearch/get/web?csrf_token=`, encData);
}

const searchPlaylist = (key, limit, page, raw) => {
  let obj = {
    s: key,
    type: 1000,
    limit: limit,
    offset: (page - 1)*limit
  };
  let encData = Enc.aesRsaEncrypt(JSON.stringify(obj));
  if(!raw){
    return new Promise((resolve, reject) => {
      NeteaseRequest(`/cloudsearch/get/web?csrf_token=`, encData)
        .then(res => {
          let playlists = res.result.playlists.map(item => {
            return {
              id: item.id,
              cover: item.coverImgUrl,
              name: item.name,
              author: {
                name: item.creator.nickname,
                id: item.creator.userId,
                // @important: no avatar here
                avatar: null
              }
            }
          });
          let obj = {
            success: true,
            total: res.result.playlistCount,
            playlists: playlists
          }
          resolve(obj);
        })
        .catch(err => reject({
          success: false,
          message: err
        }))
    });
  }
  return NeteaseRequest(`/cloudsearch/get/web?csrf_token=`, encData);
}

const searchAlbum = (key, limit, page, raw) => {
  let obj = {
    s: key,
    type: 10,
    limit: limit,
    offset: (page - 1)*limit
  };
  let encData = Enc.aesRsaEncrypt(JSON.stringify(obj));
  if(!raw){
    return new Promise((resolve, reject) => {
      NeteaseRequest(`/cloudsearch/get/web?csrf_token=`, encData)
        .then(res => {
          let albumList = res.result.albums.map(item => {
            return {
              id: item.id,
              cover: item.picUrl,
              name: item.name,
              artist: {
                name: item.artist.name,
                id: item.artist.id
              }
            }
          });
          let obj = {
            success: true,
            total: res.result.albumCount,
            albumList: albumList
          };
          resolve(obj)
        })
        .catch(err => reject({
          success: false,
          message: err
        }))
    });
  }
  return NeteaseRequest(`/cloudsearch/get/web?csrf_token=`, encData);
}

const getSong = (id, raw) => {
  id = id.split('.').map(i => parseInt(i));
  let obj = {
    'ids': id,
    'br': 999000,
    'csrf_token': ''
  };
  let encData = Enc.aesRsaEncrypt(JSON.stringify(obj));
  if(raw){
    return NeteaseRequest(`/song/enhance/player/url?csrf_token=`, encData);
  }
  return new Promise((resolve, reject) => {
    NeteaseRequest(`/song/enhance/player/url?csrf_token=`, encData)
      .then(res => {
        if(!res.data[0].url){
          reject({
            success: false,
            message: 'no match id found ! '
          })
        }
        resolve({
          success: true,
          url: res.data[0].url
        })
      })
      .catch(err => reject({
        success: false,
        message: err
      }))
  });
}

const getAlbum = (id, raw) => {
  let obj = {
    'csrf_token': ''
  };
  let encData = Enc.aesRsaEncrypt(JSON.stringify(obj));
  if(raw){
    return NeteaseRequest(`/v1/album/${id}?csrf_token=`, encData);
  }
  return new Promise((resolve, reject) => {
    NeteaseRequest(`/v1/album/${id}?csrf_token=`, encData)
      .then(res => {
        let ab = res.songs;
        let songList = ab.map(item => {
          return {
            id: item.id,
            name: item.name,
            artist: item.ar
          }
        });
        let obj = {
          success: true,
          name: res.album.name,
          id: res.album.id,
          cover: res.album.picUrl,
          artist: {
            name: res.album.artist.name,
            id: res.album.artist.id
          },
          songList: songList
        };
        resolve(obj);
      })
      .catch(err => reject({
        success: false,
        message: err
      }))
  });
}

const getPlaylist = (id, raw) => {
  let obj = {
    id,
    n: 1000,
    'csrf_token': ''
  };
  let encData = Enc.aesRsaEncrypt(JSON.stringify(obj));
  if(raw){
    return NeteaseRequest(`/v3/playlist/detail?csrf_token=`, encData);
  }
  return new Promise((resolve, reject) => {
    NeteaseRequest(`/v3/playlist/detail?csrf_token=`, encData)
      .then(res => {
        try {
          let songList = res.playlist.tracks.map(item => {
            return {
              id: item.id,
              name: item.name,
              artist: item.ar,
              album: {
                id: item.al.id,
                cover: item.al.picUrl,
                name: item.al.name
              }
            }
          });
          let obj = {
            success: true,
            name: res.playlist.name,
            id: id,
            cover: null,
            author: {
              id: res.playlist.creator.userId,
              name: res.playlist.creator.nickname,
              avatar: res.playlist.creator.avatarUrl
            },
            songList: songList
          };
          resolve(obj);
        } catch (e) {
          console.log(e);
          reject({
            success: false,
            message: 'your netease playlist id is not correct or data mapping is not correct, try query with raw=true'
          })
        }
      })
      .catch(err => reject({
        success: false,
        message: err
      }))
  });
}

module.exports = {
  searchSong: searchSong,
  searchPlaylist: searchPlaylist,
  searchAlbum: searchAlbum,
  getSong: getSong,
  getAlbum: getAlbum,
  getPlaylist: getPlaylist
};

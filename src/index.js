const _ = require('lodash')
const fetch = require('node-fetch')
const axios = require('axios')
// const convert = require('convert')
// const XMLHttpRequest = require('xmlhttprequest')
// const xhr = new XMLHttpRequest();
// import {map, flatten, filter} from 'lodash'
// import {fetch} from '../lib/fetch'
// import {mandrillBody} from '../json/event'
import {mandrillBody} from '../json/testJson'
console.log('------', mandrillBody())
let apiServerUrl;
let apiServerAuthKey;
const eventList = []
let eventObj = {};
const eventDefaultObj = {
  'eventQuantity':null,
  'eventValue':null,
  'transactionCode':null,
  'inMesssageId':null,
  'outMessageId':null,
  'eventTrackingId':null,
  'trackingRuleId':null,
  'partnerId':null,
  'subDomain1':null,
  'subDomain2':null,
  'subDomain3':null,
  'address':'Mandrill',
  'consumerIdEncrypted': true,
  'customDomains': {}
}
const eventTypes = [
  {
    event: 'send',
    eventType: 'CONFIRMED_DELIVERY',
    type: 1
  },
  {
    event: 'click',
    eventType: 'EMAIL_CLICKED',
    type: 2
  },
  {
    event: 'open',
    eventType: 'EMAIL_OPENED',
    type: 3
  },
  {
    event: 'hard_bounce',
    eventType: 'EMAIL_BOUNCED',
    type: 4
  },
  {
    event: 'soft_bounce',
    eventType: 'EMAIL_BOUNCED',
    type: 5
  }
]
const parentKeys = [
  {key: 'event', eventType: [1,2,3,4,5], eventKey: 'eventType'},
  {key: 'msg'},
  {key: 'location'},
  {key: 'user_agent_parsed'},
  {key: 'user_agent_parsed', eventType: [2], eventKey: 'customDomains', keys: ['ua_family', 'os_family', 'mobile']},
  {key: 'user_agent_parsed', eventType: [3], eventKey: 'customDomains', keys: ['os_family', 'mobile']}
]
const childKeys = {
  msg:[
    {key: 'msg.ts', eventType: [1,2,3,4,5], eventKey: 'eventDate'},
    {key: 'clicks'},
    {key: 'metadata'},
    {key: 'msg.diag', eventType: [4,5], eventKey: 'subDomain1'},
    {key: 'msg.state', eventType: [4,5], eventKey: 'subDomain3'},
    {key: 'msg.bounce_description', eventType: [4,5], eventKey: 'subDomain2'}
  ],
  location: [{key: 'location.country_short', eventType: [2,3], eventKey: 'subDomain1'}],
  user_agent_parsed: [
    {key: 'user_agent_parsed.type', eventType: [3], eventKey: 'subDomain2'},
    {key: 'user_agent_parsed.ua_family', eventType: [3], eventKey: 'subDomain3'},
    {key: 'user_agent_parsed.type', eventType: [2], eventKey: 'subDomain3'},
  ],
  clicks: [
    {key: 'msg.clicks.url', eventKey: 'subDomain2', eventType: [2]}
  ],
  metadata: [
    {key: 'msg.metadata.enc_msisdn', eventType: [1,2,3,4,5], eventKey: 'consumerId'}, 
    {key: 'msg.metadata.event_instance_id', eventType: [1,2,3,4,5], eventKey: 'eventInstanceId'}
  ]
}

const generateEventObj = () => {
  _.forEach(eventTypes, eto => {
    let et = eto.event
    let mandrilObj = _.find(mandrillBody(), {event: et});
    if (mandrilObj) {
      apiServerAuthKey = mandrilObj.msg.metadata['neon-webhook-api-key'];
      apiServerUrl = mandrilObj.msg.metadata['neon-webhook-api-addr'];
      eventObj = {};
      mandrilObj.event = eto.eventType;
      setEventObj(parentKeys, mandrilObj, eto.type);
      let finalObj = {...eventDefaultObj, ...eventObj}
      eventList.push(finalObj);
    }
  })
  console.log('----eventList---', eventList);
  apiServerAuthKey = 'kng123';
  let finalUrl = apiServerUrl + 'rest/authkey/'+ apiServerAuthKey +'/event_upload/system';
  
  /// ----- node fetch -----
  var myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");

  var raw = JSON.stringify(eventList);
  var requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow'
  };

fetch(finalUrl, requestOptions)
  .then(response => response.text())
  .then(result => console.log(result))
  .catch(error => console.log('error', error));


////----- Axios ----

  // let myHeaders = new Headers();
  // myHeaders.append("Content-Type", "application/json");

  // let config = {
  //   headers: myHeaders
  // }

  
  // let config = {
  //   headers: {
  //     'Content-Type': 'application/json'
  //   }
  // }
  // axios({ 
  //   method: 'POST',
  //   url:finalUrl,
  //   data: eventList
  // }, config)
  // .then((res) => {
  //   console.log(`statusCode: ${res.status}`)
  //   let status = document.querySelector('#root');
  //   let h41 = document.createElement('h4')
  //   let h42 = document.createElement('h4')
  //   h41.style.color = 'green'
  //   h42.style.color = 'orange'
  //   h41.innerHTML = `statusCode: ${res.status}`;
  //   h42.innerHTML = `statusText: ${res.statusText}`;
  //   status.appendChild(h41)
  //   status.appendChild(h42)
  //   console.log(res)
  // })
  // .catch((error) => {
  //   console.error(error)
  // })


}

const setEventObj = (keysList, mandrilObj, etType) => {
  let childKey;
  _.forEach(keysList, kl => {
    if (kl.eventKey) {
      let typeChk = kl.eventType && kl.eventType.includes(etType);
      if (kl.key.includes('.')) {
        let chKeys = kl.key.split('.');
        let mandrilChildObj = mandrilObj;
        _.forEach(chKeys, ck => {
          if (mandrilChildObj && _.isArray(mandrilChildObj[ck])) {
            mandrilChildObj = mandrilChildObj[ck][0]
          } else {
            mandrilChildObj = mandrilChildObj ? setActualValue(mandrilChildObj[ck]) : null
          }
          if (mandrilChildObj && ck === 'diag') {
            let diag = mandrilChildObj.split(';')[1];
            diag = diag.split(' ')[0]
            mandrilChildObj = diag
          }
        })
        if (typeChk) {
          eventObj[kl.eventKey] = setActualValue(mandrilChildObj)
        }
      } else {
        if (typeChk) {
          if (kl.keys && kl.keys.length) {
            eventObj[kl.eventKey] = populateCustomDomains(kl, mandrilObj)
          } else {
            eventObj[kl.eventKey] = setActualValue(mandrilObj[kl.key])
          }
        }
      }
    } else {
      childKey = childKeys[kl.key]
      setEventObj(childKey, mandrilObj, etType)
    }
  })
}

const setActualValue = str => {
  return typeof str === 'string' ? str.replace(/\+/g, ' ') : str
}

const populateCustomDomains = (kl, mo) => {
  let cd = {};
  let ua = mo[kl.key]
  let objKey = 'Domain'
  let idx = 4
  _.map(kl.keys, (key, i) => cd[objKey + (idx + i)] = setActualValue(ua[key]))
  return cd;
}
generateEventObj()
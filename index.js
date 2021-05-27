'use strict'
const cote = require('cote')({statusLogsEnabled:false});
const u = require('@elife/utils');


/*      understand/
 * This is the main entry point where we start.
 *
 *      outcome/
 * Start our microservice and register with the communication manager.
 */

function main() {
    startMicroservice()
    registerWithCommMgr()
}

//microservice key (identity of the microservice) /
let msKey = 'eskill_pay'

const commMgrClient = new cote.Requester({
    name: 'pay skill -> CommMgr',
    key: 'everlife-communication-svc',
})

const stellarClient = new cote.Requester({
    name: 'pay skill -> Stellar',
    key: 'everlife-stellar-svc',
  })

function sendReply(msg, req) {
    req.type = 'reply'
    req.msg = String(msg)
    commMgrClient.send(req, (err) => {
        if (err) {
            u.showErr('eskill_pay:')
            u.showErr(err)
        }
    })
}

function registerWithCommMgr() {
    commMgrClient.send({
        type: 'register-msg-handler',
        mskey: msKey,
        mstype: 'msg',
        mshelp: [
            { cmd: '/pay', txt: 'For making payment' } 
        ],
    }, (err) => {
        if(err) u.showErr(err)
    })
}

function startMicroservice() {
    const svc = new cote.Responder({
        name: 'pay',
        key: msKey,    
    })
    let payment= {}
    let isPayment = false
    svc.on('msg', (req, cb) => {
        if(!req.msg) return cb()
        const msg = req.msg.trim()
        
        if(msg.startsWith('/pay')) {
            cb(null, true)
            payment ={}
            isPayment = true
            sendReply("Enter the destination account id",req) // Getting reciever's acc address
        }else if(isPayment && !payment.account){
            payment['account'] = req.msg
            cb(null,true)
            sendReply('Which currency EVER or XLM?',req) // Getting the currency to be transferred. 
        
        }else if(isPayment && !payment.currency){
            payment['currency'] = req.msg
            cb(null,true)
            sendReply('Enter the amount to be transfered',req) // Getting the amount to be transferred. 
        }else if(isPayment && !payment.amount){
            payment['amount'] = req.msg
            cb(null,true)
            isPayment = false
            sendReply('Processing........',req)
            stellarClient.send({type:'pay',currency:payment.currency,amt:payment.amount,to:payment.account},(err, res)=>{   
            if (err){ 
            u.showErr(err)
            sendReply('Sorry transaction not completed. Try again.', req)
            cb(null,true)
            }
            else {
            sendReply('Transaction Done', req)
            cb(null, true)
            }
            })
        }else {
       cb()
        }
    })
}

main()

const script = document.createElement('script')
script.setAttribute('async', 'false')
script.setAttribute('type', 'text/javascript')
script.setAttribute('src', chrome.runtime.getURL('js/nostr-provider.js'))
document.head.appendChild(script)

console.log('done')

export {}

goog.module('com.martinletis.contacts');

goog.require('i18n.phonenumbers.PhoneNumberUtil');

const phoneNumberUtil = i18n.phonenumbers.PhoneNumberUtil.getInstance();

function stringify(connection) {
  if (connection['names']) {
    return connection['names'].map(name => name['displayName']).join(',');
  }
  if (connection['organizations']) {
    return connection['organizations'].map(organization => organization['name']).join(',');
  }
  return '';
}

// https://developers.google.com/people/api/rest/v1/people.connections/list
function listConnections(token, nextPageToken) {
  const url = new URL('https://people.googleapis.com/v1/people/me/connections');
  url.searchParams.append('pageSize', '1000');
  if (nextPageToken) {
    url.searchParams.append('pageToken', nextPageToken);
  }
  url.searchParams.append('personFields', 'names,organizations,phoneNumbers,addresses,birthdays');

  fetch(url, {headers: {'Authorization': 'Bearer ' + token}})
    .then(response => response.json())
    .then(data => {
      const table = document.getElementById('contacts');
      data['connections'].sort((a,b) => stringify(a).localeCompare(stringify(b))).forEach(connection => {
        const row = table.insertRow();

        const name = document.createElement('a');
        name.appendChild(document.createTextNode(stringify(connection)));
        name.href = 'https://contacts.google.com/person/' + connection['resourceName'].split('/').at(-1);
        name.target = '_blank';
        row.insertCell().appendChild(name);

        const phoneNumbers = row.insertCell();
        if (connection['phoneNumbers']) {
          phoneNumbers.appendChild(document.createTextNode(connection['phoneNumbers'].map(phoneNumber => phoneNumber['value'])));
          connection['phoneNumbers'].forEach(phoneNumber => {
            const number = phoneNumber['value'];
            // Validation: value must start with '+'
            if (!number.startsWith('+')) {
              phoneNumbers.bgColor = '#ee9090';
            }

            // Validation: value must be a valid number
            const proto = phoneNumberUtil.parse(number);
            if (!phoneNumberUtil.isValidNumber(proto)) {
              phoneNumbers.bgColor = '#ee9090';
            }

            // Validation: international number format is stable
            if (number != phoneNumberUtil.format(proto, i18n.phonenumbers.PhoneNumberFormat.INTERNATIONAL)) {
              phoneNumbers.bgColor = '#ee9090';
            }
          });
        }

        const addresses = row.insertCell();
        if (connection['addresses']) {
          addresses.appendChild(document.createTextNode(connection['addresses'].map(address => address['formattedValue'])));
          connection['addresses'].forEach(address => {
            // Validation: streetAddress must not contain '\n'
            if (address['streetAddress'].includes('\n')) {
              addresses.bgColor = '#ee9090';
            }

            // Validation: extendedAddress is undefined
            if (address['extendedAddress']) {
              addresses.bgColor = '#ee9090';
            }

            // Validation: city is defined
            if (!address['city']) {
              addresses.bgColor = '#ee9090';
            }

            // Validation: italian address does not start with a number
            if (address['country']=='IT' && address['streetAddress'].match(/^\d/)) {
              addresses.bgColor = '#ee9090';
            }
          });
        }

        const birthdays = row.insertCell();
        if (connection['birthdays']) {
          birthdays.appendChild(document.createTextNode(connection['birthdays'].filter(birthday => birthday['date']).map(
            birthday => new Date(birthday['date']['year'], birthday['date']['month'], birthday['date']['day']).toDateString())));
          connection['birthdays'].forEach(birthday => {
            if (!birthday['date']) {
              birthdays.bgColor = '#ee9090';
            }
          });
        }
      });
      if (data['nextPageToken']) {
        listConnections(token, data['nextPageToken']);
      }
    });
}

function initAuth() {
  const client = google.accounts.oauth2.initTokenClient({
    'client_id': '927409904390-9tidmge2ih2brcffsmt41t82knnucss4.apps.googleusercontent.com',
    'scope': 'https://www.googleapis.com/auth/contacts.readonly',
    'callback': tokenResponse => listConnections(tokenResponse.access_token, undefined),
    'prompt': '',
    'enable_granular_consent': false,
  });
  
  client.requestAccessToken();
} 
 
goog.exportSymbol('initAuth', initAuth);

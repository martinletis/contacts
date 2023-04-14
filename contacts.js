function stringify(connection) {
  if (connection.names) {
    return connection.names.map(name => name.displayName).join(',');
  }
  if (connection.organizations) {
    return connection.organizations.map(organization => organization.name).join(',');
  }
  return '';
}

// https://developers.google.com/people/api/rest/v1/people.connections/list
function listConnections(token, nextPageToken) {
  const url = new URL('https://people.googleapis.com/v1/people/me/connections');
  url.searchParams.append('pageSize', 1000);
  if (nextPageToken) {
    url.searchParams.append('pageToken', nextPageToken);
  }
  url.searchParams.append('personFields', 'names,organizations,phoneNumbers,addresses');

  fetch(url, {headers: {Authorization: 'Bearer ' + token}})
    .then(response => response.json())
    .then(data => {
      const table = document.getElementById('contacts');
      data.connections.sort((a,b) => stringify(a).localeCompare(stringify(b))).forEach(connection => {
        const row = table.insertRow();
        row.insertCell().appendChild(document.createTextNode(stringify(connection)));

        const phoneNumbers = row.insertCell();
        if (connection.phoneNumbers) {
          phoneNumbers.appendChild(document.createTextNode(connection.phoneNumbers.map(phoneNumber => phoneNumber.value)));
          connection.phoneNumbers.forEach(phoneNumber => {
            // Validation: value must start with '+'
            if (!phoneNumber.value.startsWith('+')) {
              phoneNumbers.bgColor = '#ee9090';
            }
            // parse
            // isValidNumber
          });
        }

        // contains '\n'
        const addresses = row.insertCell();
        if (connection.addresses) {
          addresses.appendChild(document.createTextNode(connection.addresses.map(address => address.formattedValue)));
          connection.addresses.forEach(address => {
            // Validation: streetAddress must not contain '\n'
            if (address.streetAddress.includes('\n')) {
              addresses.bgColor = '#ee9090';
            }
          })
        }
      });
      if (data.nextPageToken) {
        listAlbums(token, data.nextPageToken);
      }
    });
}

function initAuth() {
  client = google.accounts.oauth2.initTokenClient({
    client_id: '927409904390-9tidmge2ih2brcffsmt41t82knnucss4.apps.googleusercontent.com',
    scope: 'https://www.googleapis.com/auth/contacts.readonly',
    callback: (tokenResponse) => {
      listConnections(tokenResponse.access_token);
    },
  });
  
  client.requestAccessToken();
}  


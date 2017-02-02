package com.martinletis.contacts;

import com.google.api.client.auth.oauth2.AuthorizationCodeFlow;
import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.extensions.java6.auth.oauth2.AbstractPromptReceiver;
import com.google.api.client.extensions.java6.auth.oauth2.AuthorizationCodeInstalledApp;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.auth.oauth2.GoogleOAuthConstants;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.google.api.client.util.store.FileDataStoreFactory;
import com.google.common.base.Joiner;
import com.google.common.base.Preconditions;
import com.google.gdata.client.Query;
import com.google.gdata.client.contacts.ContactsService;
import com.google.gdata.data.contacts.ContactEntry;
import com.google.gdata.data.contacts.ContactFeed;
import com.google.gdata.data.contacts.ContactGroupEntry;
import com.google.gdata.data.contacts.ContactGroupFeed;
import com.google.gdata.data.contacts.SystemGroup;
import com.google.gdata.data.extensions.PhoneNumber;
import com.google.gdata.data.extensions.StructuredPostalAddress;
import com.google.i18n.phonenumbers.PhoneNumberUtil;
import com.google.i18n.phonenumbers.Phonenumber;
import java.io.File;
import java.io.IOException;
import java.net.URL;
import java.util.Collections;

public class ContactEntryValidator {

  private static final String APP_NAME = "martinletis-contacts-0.1";

  private static final String CLIENT_ID =
      "927409904390-plkij2qn1d77pc7ealoku3jl9bss5653.apps.googleusercontent.com";

  // TODO: find constant for this
  private static final String CONTACTS_SCOPE = "https://www.google.com/m8/feeds";

  private static final PhoneNumberUtil PHONE_NUMBER_UTIL = PhoneNumberUtil.getInstance();

  public static void main(String[] args) throws Exception {
    Preconditions.checkArgument(args.length == 1, "Invoke with 'clientSecret'");

    String clientSecret = args[0];
    Preconditions.checkArgument(!clientSecret.isEmpty());

    NetHttpTransport transport = GoogleNetHttpTransport.newTrustedTransport();
    JacksonFactory jsonFactory = JacksonFactory.getDefaultInstance();

    File dataDirectory = new File(
        Joiner.on(File.separator).join(System.getProperty("user.home"), "tmp", "datastore"));

    AuthorizationCodeFlow flow = new GoogleAuthorizationCodeFlow.Builder(
        transport, jsonFactory, CLIENT_ID, clientSecret, Collections.singleton(CONTACTS_SCOPE))
        .setAccessType("offline")
        .setDataStoreFactory(new FileDataStoreFactory(dataDirectory))
        .build();

    Credential credential = new AuthorizationCodeInstalledApp(flow, new AbstractPromptReceiver() {
      @Override
      public String getRedirectUri() throws IOException {
        return GoogleOAuthConstants.OOB_REDIRECT_URI;
      }
    }).authorize(APP_NAME);

    ContactsService service = new ContactsService(APP_NAME);
    service.setOAuth2Credentials(credential);

    ContactGroupFeed groupFeed = service.getFeed(
        new URL("https://www.google.com/m8/feeds/groups/default/full"), ContactGroupFeed.class);

    String groupId = null;
    for (ContactGroupEntry entry : groupFeed.getEntries()) {
      SystemGroup systemGroup = entry.getExtension(SystemGroup.class);
      if (systemGroup != null && "Contacts".equals(systemGroup.getId())) {
        groupId = entry.getId();
        break;
      }
    }

    Query query = new Query(new URL("https://www.google.com/m8/feeds/contacts/default/full"));
    query.setMaxResults(Integer.MAX_VALUE);
    query.setStringCustomParameter("group", Preconditions.checkNotNull(groupId));

    ContactFeed feed = service.getFeed(query, ContactFeed.class);

    System.out.println(feed.getTitle().getPlainText());

    for (ContactEntry entry : feed.getEntries()) {
      String name = entry.getName().getFullName().getValue();
      boolean updated = false;

      for (PhoneNumber phoneNumber : entry.getPhoneNumbers()) {
        String number = phoneNumber.getPhoneNumber();

        Preconditions.checkState(
            number.startsWith("+"),
            name + " - " + number);

        Phonenumber.PhoneNumber proto = PHONE_NUMBER_UTIL.parse(number, null);
        Preconditions.checkState(PHONE_NUMBER_UTIL.isValidNumber(proto), proto);

        String formatted =
            PHONE_NUMBER_UTIL.format(proto, PhoneNumberUtil.PhoneNumberFormat.INTERNATIONAL);

        if (!formatted.equals(number)) {
          System.out.println(String.format("%s - changing %s to %s", name, number, formatted));

          phoneNumber.setPhoneNumber(formatted);
          updated = true;
        }
      }

      for (StructuredPostalAddress structuredPostalAddress : entry.getStructuredPostalAddresses()) {
        if (structuredPostalAddress.getStreet().getValue().contains("\n")) {
          System.err.println(name);
        }
      }

      if (updated) {
        entry = service.update(new URL(entry.getEditLink().getHref()), entry);
      }
    }

    System.out.println("Total entries: " + feed.getEntries().size());
  }
}

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
import com.google.api.services.people.v1.PeopleService;
import com.google.api.services.people.v1.PeopleService.People;
import com.google.api.services.people.v1.PeopleServiceScopes;
import com.google.api.services.people.v1.model.Address;
import com.google.api.services.people.v1.model.ListConnectionsResponse;
import com.google.api.services.people.v1.model.Person;
import com.google.api.services.people.v1.model.PhoneNumber;
import com.google.common.base.Joiner;
import com.google.common.base.Preconditions;
import com.google.common.util.concurrent.RateLimiter;
import com.google.i18n.phonenumbers.PhoneNumberUtil;
import com.google.i18n.phonenumbers.Phonenumber;
import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class ContactEntryValidator {

  private static final String APP_NAME = "martinletis-contacts-0.1";

  private static final String CLIENT_ID =
      "927409904390-plkij2qn1d77pc7ealoku3jl9bss5653.apps.googleusercontent.com";

  private static final int MAX_PAGE_SIZE = 1000;
  private static final int MAX_REQUESTS_PER_MINUTE = 5;

  private static final PhoneNumberUtil PHONE_NUMBER_UTIL = PhoneNumberUtil.getInstance();

  public static void main(String[] args) throws Exception {
    Preconditions.checkArgument(args.length == 1, "Invoke with 'clientSecret'");

    String clientSecret = args[0];
    Preconditions.checkArgument(!clientSecret.isEmpty());

    NetHttpTransport transport = GoogleNetHttpTransport.newTrustedTransport();
    JacksonFactory jsonFactory = JacksonFactory.getDefaultInstance();

    File dataDirectory =
        new File(
            Joiner.on(File.separator).join(System.getProperty("user.home"), "tmp", "datastore"));

    AuthorizationCodeFlow flow =
        new GoogleAuthorizationCodeFlow.Builder(
                transport,
                jsonFactory,
                CLIENT_ID,
                clientSecret,
                Collections.singleton(PeopleServiceScopes.CONTACTS_READONLY))
            .setAccessType("offline")
            .setDataStoreFactory(new FileDataStoreFactory(dataDirectory))
            .build();

    Credential credential =
        new AuthorizationCodeInstalledApp(
                flow,
                new AbstractPromptReceiver() {
                  @Override
                  public String getRedirectUri() throws IOException {
                    return GoogleOAuthConstants.OOB_REDIRECT_URI;
                  }
                })
            .authorize(APP_NAME);

    People people =
        new PeopleService.Builder(transport, jsonFactory, credential)
            .setApplicationName(APP_NAME)
            .build()
            .people();

    RateLimiter limiter = RateLimiter.create((double) MAX_REQUESTS_PER_MINUTE / 60);
    String pageToken = null;
    do {
      limiter.acquire();
      ListConnectionsResponse connectionsResponse =
          people
              .connections()
              .list("people/me")
              .setPageToken(pageToken)
              .setPageSize(MAX_PAGE_SIZE)
              .setPersonFields("names,phoneNumbers,addresses")
              .execute();

      for (Person person : connectionsResponse.getConnections()) {
        for (PhoneNumber phoneNumber : safe(person.getPhoneNumbers())) {
          String number = phoneNumber.getValue();

          Preconditions.checkState(number.startsWith("+"), person);

          Phonenumber.PhoneNumber proto = PHONE_NUMBER_UTIL.parse(number, null);
          Preconditions.checkState(PHONE_NUMBER_UTIL.isValidNumber(proto), proto);

          String formatted =
              PHONE_NUMBER_UTIL.format(proto, PhoneNumberUtil.PhoneNumberFormat.INTERNATIONAL);

          if (!formatted.equals(number)) {
            System.out.println(String.format("%s - changing %s to %s", person, number, formatted));
          }
        }

        for (Address address : safe(person.getAddresses())) {
          if (address.getStreetAddress().contains("\n")) {
            System.err.println(person);
          }
        }
      }

      pageToken = connectionsResponse.getNextPageToken();
    } while (pageToken != null);
  }

  private static <E> List<E> safe(List<E> list) {
    return list == null ? new ArrayList<>() : list;
  }
}

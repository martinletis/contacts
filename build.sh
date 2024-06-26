# https://developers.google.com/closure/compiler/docs/gettingstarted_app
# https://mvnrepository.com/artifact/com.google.javascript/closure-compiler
# CLOSURE_COMPILER_JAR=$HOME/bin/closure-compiler-v00000000.jar

# git clone git@github.com:google/closure-library.git
# git clone git@github.com:google/libphonenumber.git

java -jar ${CLOSURE_COMPILER_JAR:?} \
  --entry_point='goog:com.martinletis.contacts' \
  --js_output_file='contacts-compiled.js' \
  --js='contacts.js' \
  --js='../closure-library/closure/goog/**.js' \
  --js='!../closure-library/closure/goog/**_test.js' \
  --js='../libphonenumber/javascript/i18n/phonenumbers/metadata.js' \
  --js='../libphonenumber/javascript/i18n/phonenumbers/phonemetadata.pb.js' \
  --js='../libphonenumber/javascript/i18n/phonenumbers/phonenumber.pb.js' \
  --js='../libphonenumber/javascript/i18n/phonenumbers/phonenumberutil.js' \
  --compilation_level='ADVANCED_OPTIMIZATIONS' \
  --externs='contacts_externs.js'

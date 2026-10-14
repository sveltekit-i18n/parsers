### Resource comment

## Group: shop
-brand = Acme
    .gender = masculine
-product = { $case ->
   *[nom] Widget
    [gen] Widgetu
}

# Greeting with a variable
welcome = Welcome, { $user }, to { -brand }!
emails = { $unreadEmails ->
        [one] You have one unread email.
       *[other] You have { $unreadEmails } unread emails.
    }
price = Price: { NUMBER($amount, minimumFractionDigits: 2) }
last-login = Last login: { DATETIME($date, month: "long", day: "numeric") }
multi =
    First line
      indented second
    third
shared-photos =
    { $userName } { $photoCount ->
        [one] added a new photo
       *[other] added { $photoCount } new photos
    } to { $userGender ->
        [male] his stream
        [female] her stream
       *[other] their stream
    }.
login-input = Predefined value
    .placeholder = email@example.com
    .aria-label = Login input value
    .title = Type your login email
attr-only =
    .label = Only an attribute
brand-says = { -brand.gender ->
    [masculine] He
   *[other] It
} says { -product(case: "gen") }
ref = See { welcome } and { login-input.title }
escaped = {"{"}literal{"}"} and {"  "}spaces
blank-lines =
    Para one

    Para two

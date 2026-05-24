self.addEventListener(
    "install",
    () => {

        self.skipWaiting();

    }
);

self.addEventListener(
    "activate",
    () => {

        console.log(
            "SW Active"
        );

    }
);

self.addEventListener(
    "push",
    (event) => {

        const data =
            event.data
            ? event.data.json()
            : {};

        self.registration.showNotification(

            data.title ||
            "Incoming Call",

            {

                body:
                    data.body ||
                    "Family member calling",

                icon:
                    "/assets/icon.png"

            }

        );

    }
);
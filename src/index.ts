import got from "got";
import * as rt from "runtypes";
import { CookieJar } from "tough-cookie";

const login = async (
  email: string,
  password: string,
  cookieJar: CookieJar
): Promise<boolean> => {
  const response = await got({
    cookieJar,
    form: { email, password },
    method: "POST",
    responseType: "json",
    throwHttpErrors: false,
    url: "https://api.tryfi.com/auth/login",
  });

  return response.statusCode === 200;
};

const getDetails = async (
  email: string,
  password: string,
  cookieJar: CookieJar
): Promise<unknown> => {
  const response = await got({
    cookieJar,
    json: {
      query: `  
        query CurrentUserFullDetail {
          currentUser {
            userHouseholds {
              household {
                bases {
                  baseType: __typename
                  baseId
                  infoLastUpdated
                  online
                  onlineQuality
                  name
                  networkName
                  position {
                    latitude
                    longitude
                  }
                }
                pets {
                  device {
                    availableLedColors {
                      hexCode
                      ledColorCode
                      name
                    }
                    hasActiveSubscription
                    hasSubscriptionOverride
                    id
                    info
                    lastConnectionState {
                      connectionStateType: __typename
                      date
                      ... on ConnectedToBase {
                        chargingBase {
                          baseType: __typename
                          id
                          name
                        }
                      }
                      ... on ConnectedToCellular {
                        signalStrengthPercent
                      }
                      ... on ConnectedToUser {
                        user {
                          email
                          id
                        }
                      }
                      ... on UnknownConnectivity {
                        unknownConnectivity
                      }
                    }
                    ledColor {
                      hexCode
                      ledColorCode
                      name
                    }
                    moduleId
                    nextLocationUpdateExpectedBy
                    operationParams {
                      ledEnabled
                      ledOffAt
                      mode
                    }
                    subscriptionId
                  }
                  id
                  name
                  ongoingActivity(walksVersion: 1) {
                    activityType: __typename
                    areaName
                    lastReportTimestamp
                    obfuscatedReason
                    presentUser {
                      id
                      email
                    }
                    start
                    totalSteps
                    uncertaintyInfo {
                      areaName
                      circle {
                        latitude
                        longitude
                        radius
                      }
                      updatedAt
                    }
                    ... on OngoingWalk {
                      distance
                      path {
                        latitude
                        longitude
                      }
                      positions {
                        date
                        errorRadius
                        position {
                          latitude
                          longitude
                        }
                      }
                    }
                    ... on OngoingRest {
                      place {
                        address
                        id
                        name
                        position {
                          latitude
                          longitude
                        }
                        radius
                      }
                      position {
                        latitude
                        longitude
                      }
                    }
                  }
                  statDaily: currentActivitySummary (period: DAILY) {
                    end
                    start
                    stepGoal
                    totalDistance
                    totalSteps
                  }
                  statMonthly: currentActivitySummary (period: MONTHLY) {
                    end
                    start
                    stepGoal
                    totalDistance
                    totalSteps
                  }
                  statWeekly: currentActivitySummary (period: WEEKLY) {
                    end
                    start
                    stepGoal
                    totalDistance
                    totalSteps
                  }
                }
              }
            }
          }
        }
      `,
    },
    method: "POST",
    responseType: "json",
    throwHttpErrors: false,
    url: "https://api.tryfi.com/graphql",
  });

  if (response.statusCode === 401) {
    if (await login(email, password, cookieJar)) {
      return await getDetails(email, password, cookieJar);
    } else {
      throw new Error("invalid login");
    }
  } else {
    const schema = rt.Record({
      data: rt.Record({
        currentUser: rt.Record({
          userHouseholds: rt.Array(
            rt.Record({
              household: rt.Record({
                bases: rt.Array(rt.Unknown),
                pets: rt.Array(rt.Unknown),
              }),
            })
          ),
        }),
      }),
    });

    const typedResponse = schema.check(response.body);
    return {
      bases: typedResponse.data.currentUser.userHouseholds.flatMap(
        ({ household }) => household.bases
      ),
      pets: typedResponse.data.currentUser.userHouseholds.flatMap(
        ({ household }) => household.pets
      ),
    };
  }
};

(async () => {
  const email = rt.String.check(process.env["tryfi_email"]);
  const password = rt.String.check(process.env["tryfi_password"]);

  const cookieJar = new CookieJar();

  console.log(
    JSON.stringify(await getDetails(email, password, cookieJar), null, 4)
  );
})();

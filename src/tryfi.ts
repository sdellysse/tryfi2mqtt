import got, { Response } from "got";
import * as rt from "runtypes";
import { CookieJar } from "tough-cookie";

type InputLogin = {
  readonly cookieJar: CookieJar;
  readonly tryfiEmail: string;
  readonly tryfiPassword: string;
};
export const login = async ({
  cookieJar,
  tryfiEmail,
  tryfiPassword,
}: InputLogin): Promise<boolean> => {
  const response = await got({
    cookieJar,
    form: { email: tryfiEmail, password: tryfiPassword },
    method: "POST",
    responseType: "json",
    throwHttpErrors: false,
    url: "https://api.tryfi.com/auth/login",
  });

  return response.statusCode === 200;
};

type InputLoginWrap<T> = {
  readonly cookieJar: CookieJar;
  readonly tryfiEmail: string;
  readonly tryfiPassword: string;
  readonly wrap: () => Promise<Response<T>>;
};
const loginWrap = async <T>({
  cookieJar,
  tryfiEmail,
  tryfiPassword,
  wrap,
}: InputLoginWrap<T>): Promise<Response<T>> => {
  const response = await wrap();
  if (response.statusCode !== 401) {
    return response;
  }
  if (
    await login({
      cookieJar,
      tryfiEmail,
      tryfiPassword,
    })
  ) {
    return await wrap();
  }

  throw new Error("login failed");
};

const query = <const>{
  gql: `
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
  schema: rt.Record({
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
  }),
};

type InputGetDetails = {
  readonly cookieJar: CookieJar;
  readonly tryfiEmail: string;
  readonly tryfiPassword: string;
};
export const getDetails = async ({
  cookieJar,
  tryfiEmail,
  tryfiPassword,
}: InputGetDetails): Promise<unknown> => {
  const response = await loginWrap({
    cookieJar,
    tryfiEmail,
    tryfiPassword,
    wrap: () =>
      got({
        cookieJar,
        json: { query: query.gql },
        method: "POST",
        responseType: "json",
        throwHttpErrors: false,
        url: "https://api.tryfi.com/graphql",
      }),
  });

  const typedResponse = query.schema.check(response.body);
  return {
    bases: typedResponse.data.currentUser.userHouseholds.flatMap(
      ({ household }) => household.bases
    ),
    pets: typedResponse.data.currentUser.userHouseholds.flatMap(
      ({ household }) => household.pets
    ),
  };
};

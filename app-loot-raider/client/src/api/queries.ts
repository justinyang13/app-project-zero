export const ACTIVE_PROMOTION_QUERY = `
  query ActivePromotion {
    activePromotion {
      id
      name
      chainName
      isActive
    }
  }
`;

export const COLLECTIBLE_ITEMS_QUERY = `
  query CollectibleItems($promotionId: ID!) {
    collectibleItems(promotionId: $promotionId) {
      id
      name
      imageUrl
    }
  }
`;

export const VENUES_NEAR_QUERY = `
  query VenuesNear($lat: Float!, $lng: Float!, $radiusMeters: Int!, $promotionId: ID!, $collectibleItemId: ID) {
    venuesNear(
      lat: $lat
      lng: $lng
      radiusMeters: $radiusMeters
      promotionId: $promotionId
      collectibleItemId: $collectibleItemId
    ) {
      id
      chainName
      name
      latitude
      longitude
      address
      checkInCount
      lastCheckInAtUtc
      recentItems {
        id
        name
        imageUrl
      }
    }
  }
`;

export const CHECK_INS_FOR_VENUE_QUERY = `
  query CheckInsForVenue($venueId: ID!, $promotionId: ID!) {
    checkInsForVenue(venueId: $venueId, promotionId: $promotionId) {
      id
      collectibleItemId
      venueId
      reportedAtUtc
      nickname
    }
  }
`;

export const REPORT_CHECK_IN_MUTATION = `
  mutation ReportCheckIn($input: ReportCheckInInput!) {
    reportCheckIn(input: $input) {
      id
      collectibleItemId
      venueId
      reportedAtUtc
      nickname
    }
  }
`;

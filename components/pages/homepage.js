import React from "react";
import InventoryConsole from "./inventoryConsole";
import CarList from "../dataFetch/fetchStock";
import MarketCards from "./marketCards";
import { SITE } from "../utilities/siteConfig";

function HomePage() {
  return (
    <div className="layout">
      {SITE.domain === "start-auction.com" && <MarketCards />}
      <InventoryConsole />
      <CarList />
    </div>
  );
}

export default HomePage;

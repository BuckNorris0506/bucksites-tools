import assert from 'node:assert/strict';
import test from 'node:test';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {FilterPdpLt1000pDecisionSection} from './FilterPdpLt1000pDecisionSection';
import {filterOfficialReferenceRetailerLinks, filterRealBuyRetailerLinks} from '@/lib/retailers/launch-buy-links';
import {isAffiliateUrlSafeForGoRedirect} from '@/lib/retailers/go-redirect-gate';
import row from '../../../data/evidence/lg-lt1000p-official-reference.2026-11-18.json';
test('exact LG reference passes without buying or redirect authority',()=>{
 assert.equal(filterOfficialReferenceRetailerLinks([row]).length,1);
 assert.equal(filterRealBuyRetailerLinks([row]).length,0);
 assert.equal(isAffiliateUrlSafeForGoRedirect(row.retailer_key,row.affiliate_url,row.browser_truth_classification),false);
 for(const affiliate_url of [row.affiliate_url+'?tag=x',row.affiliate_url+'/',row.affiliate_url.replace('lt1000p','lt1000pc'), 'https://www.lg.com/search?q=lt1000p','https://www.lg.com/us/appliances-accessories/other','https://www.lg.com.evil.test/product.html']) assert.equal(filterOfficialReferenceRetailerLinks([{...row,affiliate_url}]).length,0);
 for(const override of [{browser_truth_classification:'direct_buyable'},{browser_truth_notes:''},{browser_truth_checked_at:''},{retailer_key:'shark-official'}]) assert.equal(filterOfficialReferenceRetailerLinks([{...row,...override}]).length,0);
});
test('final homeowner content and collapsed support',()=>{
 const html=renderToStaticMarkup(createElement(FilterPdpLt1000pDecisionSection,{compatibleModelCount:0,buyingOptionsShown:false}));
 for(const text of ['LG LT1000P water filter','Confirmed: LG LFXC22596S','ADQ74793501','ADQ74793502, MDJ64844601, LT1000PC','$54.99','Notify Me / Find a Retailer',row.affiliate_url]) assert.ok(html.includes(text));
 assert.ok(!html.includes('/go/'));assert.ok(!/<details[^>]* open/.test(html));
});

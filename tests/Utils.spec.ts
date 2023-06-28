import 'mocha';
import sinon from 'sinon';
import { expect } from 'chai';
import { renderTimespan } from '../src/utils/DateUtils';
import { getHashedIp } from '../src/utils/HashedInfo';


describe("Utility Functions", () => {

  it("DateUtils.renderTimespan", async () => {
    expect(renderTimespan(130, 2)).to.equal("2min 10sec", "unexpected result");
    expect(renderTimespan(439964, 5)).to.equal("5d 2h 12min 44sec", "unexpected result");
    expect(renderTimespan(439964, 2)).to.equal("5d 2h", "unexpected result");
  });

  it("HashedInfo.getHashedIp", async () => {
    expect(getHashedIp("1.2.3.4", "test")).to.equal("df6.60b.ef9.b3e", "unexpected result");
    expect(getHashedIp("2003:DE:C711::ECFF:FE0E:21F1", "test")).to.equal("f84:d47:e32:0:0:dc0:d1e:d8c", "unexpected result");
  });
  
});

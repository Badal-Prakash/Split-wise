import { simplifyDebts } from "@/services/debtService";
test("simplifies transitive debt",()=>{expect(simplifyDebts([{fromUser:"A",toUser:"B",amount:10},{fromUser:"B",toUser:"C",amount:10}])).toEqual([{fromUser:"A",toUser:"C",amount:10}]);});

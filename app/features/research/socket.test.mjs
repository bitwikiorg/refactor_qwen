// test/research/socket.test.mjs
```javascript
import { initSocketHandlers } from '../../app/features/research/socket.mjs';
import { expect } from 'chai';
import sinon from 'sinon';

describe('Socket Handlers', () => {
    let namespaceMock;
    let socketMock;
    let handlersMock;
    let diContainerMock;

    beforeEach(() => {
        namespaceMock = {
            on: sinon.stub(),
            use: sinon.stub()
        };
        socketMock = {
            id: 'testSocketId',
            emit: sinon.stub()
        };
        handlersMock = {
            handleProgressUpdate: sinon.stub(),
            handleQueryCancel: sinon.stub()
        };
        diContainerMock = {
            resolve: sinon.stub().returns({
                executeQuery: sinon.stub()
            })
        };
    });

    it('should initialize socket handlers', () => {
        initSocketHandlers(namespaceMock, handlersMock, diContainerMock);

        expect(namespaceMock.on.calledWith('connection')).to.be.true;
        expect(namespaceMock.on.calledWith('query:start')).to.be.true;
        expect(namespaceMock.on.calledWith('/cancel')).to.be.true;
    });

    // Add more tests as needed
});